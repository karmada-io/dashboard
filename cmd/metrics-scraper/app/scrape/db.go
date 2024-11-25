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
