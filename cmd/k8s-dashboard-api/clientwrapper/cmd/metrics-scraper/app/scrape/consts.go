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
	createMainTableSQL = `
        CREATE TABLE IF NOT EXISTS %s (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            help TEXT,
            type TEXT,
            currentTime DATETIME
        )
    `

	createValuesTableSQL = `
        CREATE TABLE IF NOT EXISTS %s_values (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_id INTEGER,
            value TEXT,
            measure TEXT,
            FOREIGN KEY (metric_id) REFERENCES %s(id)
        )
    `

	createTimeLoadTableSQL = `
        CREATE TABLE IF NOT EXISTS %s (
            time_entry DATETIME PRIMARY KEY
        )
    `

	insertTimeLoadSQL = `
        INSERT OR REPLACE INTO %s (time_entry) VALUES (?)
    `
	// 900 is 15 minutes in seconds
	getOldestTimeSQL = `
        SELECT time_entry FROM %s
        ORDER BY time_entry DESC
        LIMIT 1 OFFSET 900  
    `

	deleteOldTimeSQL = `DELETE FROM %s WHERE time_entry <= ?`

	deleteAssociatedMetricsSQL = `
        DELETE FROM %s WHERE currentTime <= ?
    `

	deleteAssociatedValuesSQL = `
        DELETE FROM %s_values WHERE metric_id NOT IN (SELECT id FROM %s)
    `

	insertMainSQL = `
        INSERT INTO %s (name, help, type, currentTime) 
        VALUES (?, ?, ?, ?)
    `
	createLabelsTableSQL = `CREATE TABLE IF NOT EXISTS %s_labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        value_id INTEGER,
        key TEXT,
        value TEXT,
        FOREIGN KEY(value_id) REFERENCES %s_values(id)
    )`
)
