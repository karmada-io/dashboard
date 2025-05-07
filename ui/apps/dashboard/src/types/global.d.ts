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

// 为insert-css模块提供类型定义
declare module 'insert-css' {
  function insertCss(css: string, options?: { prepend?: boolean }): () => void;
  export default insertCss;
}

// 扩展全局Window接口，添加可能的全局变量
interface Window {
  // 可能需要添加的全局变量
} 