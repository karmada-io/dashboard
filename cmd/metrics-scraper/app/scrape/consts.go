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
            currentTime DATETIME
        )
    `

	createMetadataTableSQL = `CREATE TABLE IF NOT EXISTS %s_metadata (
        name TEXT PRIMARY KEY,
        help TEXT,
        type TEXT
    )`

	createValuesTableSQL = `
        CREATE TABLE IF NOT EXISTS %s_values (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_id INTEGER,
            value REAL,
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

	deleteOldTimeSQL = `DELETE FROM %s WHERE time_entry <= ?`

	deleteAssociatedMetricsSQL = `
        DELETE FROM %s WHERE currentTime <= ?
    `

	// Direct time-based deletion for values (avoids slow NOT IN subquery)
	deleteAssociatedValuesSQL = `
        DELETE FROM %s_values WHERE metric_id IN (
            SELECT id FROM %s WHERE currentTime <= ?
        )
    `

	// Direct time-based deletion for labels (avoids slow NOT IN subquery)
	deleteAssociatedLabelsSQL = `
        DELETE FROM %s_labels WHERE value_id IN (
            SELECT v.id FROM %s_values v
            INNER JOIN %s m ON v.metric_id = m.id
            WHERE m.currentTime <= ?
        )
    `

	insertMetadataSQL = `INSERT OR IGNORE INTO %s_metadata (name, help, type) VALUES (?, ?, ?)`

	insertMainSQL = `
        INSERT INTO %s (name, currentTime)
        VALUES (?, ?)
    `
	createLabelStringsTableSQL = `CREATE TABLE IF NOT EXISTS %s_label_strings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        UNIQUE(key, value)
    )`

	createLabelsTableSQL = `CREATE TABLE IF NOT EXISTS %s_labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        value_id INTEGER,
        label_string_id INTEGER,
        FOREIGN KEY(value_id) REFERENCES %s_values(id),
        FOREIGN KEY(label_string_id) REFERENCES %s_label_strings(id)
    )`

	// Index creation SQL for query performance
	createMainIndexSQL = `CREATE INDEX IF NOT EXISTS idx_%s_name_time ON %s(name, currentTime)`

	createValuesIndexSQL = `CREATE INDEX IF NOT EXISTS idx_%s_values_metric_id ON %s_values(metric_id)`

	createLabelsIndexSQL = `CREATE INDEX IF NOT EXISTS idx_%s_labels_value_id ON %s_labels(value_id)`

	createLabelStringsIndexSQL = `CREATE INDEX IF NOT EXISTS idx_%s_label_strings_kv ON %s_label_strings(key, value)`

	createAggregatesTableSQL = `CREATE TABLE IF NOT EXISTS %s_aggregates (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		measure TEXT NOT NULL,
		bucket_time DATETIME NOT NULL,
		resolution TEXT NOT NULL,
		avg_value REAL,
		max_value REAL,
		min_value REAL,
		sample_count INTEGER DEFAULT 1,
		UNIQUE(name, measure, bucket_time, resolution)
	)`

	createAggregatesIndexSQL = `CREATE INDEX IF NOT EXISTS idx_%s_aggregates_lookup ON %s_aggregates(name, measure, resolution, bucket_time)`

	insertAggregateSQL = `INSERT OR REPLACE INTO %s_aggregates (name, measure, bucket_time, resolution, avg_value, max_value, min_value, sample_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	deleteOldAggregatesSQL = `DELETE FROM %s_aggregates WHERE resolution = ? AND bucket_time <= ?`
)
