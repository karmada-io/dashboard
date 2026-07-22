/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package scrape

import (
	"database/sql"
	"fmt"
	"strings"
	"sync"
	"time"
)

var (
	dbMap     = make(map[string]*sql.DB)
	dbMapLock sync.RWMutex
)

// GetDB returns an existing database connection or creates a new one
func GetDB(appName string) (*sql.DB, error) {
	sanitizedAppName := strings.ReplaceAll(appName, "-", "_")

	dbMapLock.RLock()
	db, exists := dbMap[sanitizedAppName]
	dbMapLock.RUnlock()

	if exists {
		return db, nil
	}

	dbMapLock.Lock()
	defer dbMapLock.Unlock()

	// Double-check after acquiring write lock
	if db, exists := dbMap[sanitizedAppName]; exists {
		return db, nil
	}

	db, err := sql.Open("sqlite", fmt.Sprintf("file:%s.db?cache=shared&mode=rwc", sanitizedAppName))
	if err != nil {
		return nil, err
	}

	// Enable WAL mode for concurrent read/write
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to enable WAL mode: %w", err)
	}
	if _, err := db.Exec("PRAGMA synchronous=NORMAL"); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to set synchronous mode: %w", err)
	}
	// Enable incremental auto-vacuum to reclaim space after deletes.
	// This pragma only takes effect on new databases; for existing ones we must VACUUM.
	if _, err := db.Exec("PRAGMA auto_vacuum=INCREMENTAL"); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to set auto_vacuum: %w", err)
	}
	var vacuumMode int
	if err := db.QueryRow("PRAGMA auto_vacuum").Scan(&vacuumMode); err == nil && vacuumMode == 0 {
		// Database was created with NONE; apply change via full VACUUM
		_, _ = db.Exec("VACUUM")
	}

	// WAL mode allows concurrent readers, increase max connections
	db.SetMaxOpenConns(4)
	db.SetMaxIdleConns(2)

	dbMap[sanitizedAppName] = db
	return db, nil
}

// RunPeriodicMaintenance starts a background goroutine that periodically
// runs incremental vacuum and WAL checkpoint on all open databases.
func RunPeriodicMaintenance() {
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			dbMapLock.RLock()
			dbs := make([]*sql.DB, 0, len(dbMap))
			for _, d := range dbMap {
				dbs = append(dbs, d)
			}
			dbMapLock.RUnlock()

			for _, d := range dbs {
				// Reclaim freed pages
				_, _ = d.Exec("PRAGMA incremental_vacuum(200)")
				// Checkpoint WAL to keep file size bounded
				_, _ = d.Exec("PRAGMA wal_checkpoint(TRUNCATE)")
			}
		}
	}()
}
