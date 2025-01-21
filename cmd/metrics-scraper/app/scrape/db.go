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
)

var (
	dbMap     = make(map[string]*sql.DB)
	dbMapLock sync.RWMutex
)

// getDB returns an existing database connection or creates a new one
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

	// Set connection pool settings
	db.SetMaxOpenConns(1) // Restrict to 1 connection to prevent lock conflicts
	db.SetMaxIdleConns(1)

	dbMap[sanitizedAppName] = db
	return db, nil
}
