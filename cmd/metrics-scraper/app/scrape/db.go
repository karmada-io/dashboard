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

// GetDB 返回一个现有的数据库连接或创建一个新的连接
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

	// 在获取写锁后再次检查
	if db, exists := dbMap[sanitizedAppName]; exists {
		return db, nil
	}

	db, err := sql.Open("sqlite", fmt.Sprintf("file:%s.db?cache=shared&mode=rwc", sanitizedAppName))
	if err != nil {
		return nil, err
	}

	// 设置连接池设置
	db.SetMaxOpenConns(1) // 限制为 1 个连接以防止锁冲突
	db.SetMaxIdleConns(1)

	dbMap[sanitizedAppName] = db
	return db, nil
}
