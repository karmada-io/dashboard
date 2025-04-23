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

package terminalsetup

import (
    "github.com/gin-gonic/gin"
)


// V1 returns a new router instance for version 1 of the API
func V1() *gin.RouterGroup {
    r := gin.Default() // Initialize a new Gin router
    return r.Group("/api/v1") // This sets the base path for the group
}

