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

const (
	// createMainTableSQL 创建主表的 SQL 语句
	createMainTableSQL = `
        CREATE TABLE IF NOT EXISTS %s (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            help TEXT,
            type TEXT,
            currentTime DATETIME
        )
    `

	// createValuesTableSQL 创建值表的 SQL 语句
	createValuesTableSQL = `
        CREATE TABLE IF NOT EXISTS %s_values (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_id INTEGER,
            value TEXT,
            measure TEXT,
            FOREIGN KEY (metric_id) REFERENCES %s(id)
        )
    `

	// createTimeLoadTableSQL 创建时间加载表的 SQL 语句
	createTimeLoadTableSQL = `
        CREATE TABLE IF NOT EXISTS %s (
            time_entry DATETIME PRIMARY KEY
        )
    `

	// insertTimeLoadSQL 插入时间加载的 SQL 语句
	insertTimeLoadSQL = `
        INSERT OR REPLACE INTO %s (time_entry) VALUES (?)
    `

	// getOldestTimeSQL 获取最旧时间的 SQL 语句
	getOldestTimeSQL = `
        SELECT time_entry FROM %s
        ORDER BY time_entry DESC
        LIMIT 1 OFFSET 900  
    `

	// deleteOldTimeSQL 删除旧时间的 SQL 语句
	deleteOldTimeSQL = `DELETE FROM %s WHERE time_entry <= ?`

	deleteAssociatedMetricsSQL = `
        DELETE FROM %s WHERE currentTime <= ?
    `

	// deleteAssociatedValuesSQL 删除关联值的 SQL 语句
	deleteAssociatedValuesSQL = `
        DELETE FROM %s_values WHERE metric_id NOT IN (SELECT id FROM %s)
    `

	// insertMainSQL 插入主表的 SQL 语句
	insertMainSQL = `
        INSERT INTO %s (name, help, type, currentTime) 
        VALUES (?, ?, ?, ?)
    `

	// createLabelsTableSQL 创建标签表的 SQL 语句
	createLabelsTableSQL = `CREATE TABLE IF NOT EXISTS %s_labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        value_id INTEGER,
        key TEXT,
        value TEXT,
        FOREIGN KEY(value_id) REFERENCES %s_values(id)
    )`
)
