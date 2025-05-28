// Segmented组件选中状态修复工具
// 用于运行时强制应用选中状态样式 - 超强力版本

export const forceSegmentedSelection = () => {
  // 等待DOM完全加载
  setTimeout(() => {
    const segmentedContainers = document.querySelectorAll('.tech-segmented, .ant-segmented');
    
    segmentedContainers.forEach(container => {
      // 移除所有可能的thumb元素
      const thumbs = container.querySelectorAll('.ant-segmented-thumb');
      thumbs.forEach(thumb => {
        if (thumb instanceof HTMLElement) {
          thumb.style.display = 'none';
          thumb.style.visibility = 'hidden';
          thumb.style.opacity = '0';
          thumb.style.width = '0';
          thumb.style.height = '0';
          thumb.style.transform = 'scale(0)';
          thumb.style.position = 'absolute';
          thumb.style.zIndex = '-999';
          // 完全从DOM中移除
          try {
            thumb.remove();
          } catch (e) {
            // 忽略移除错误
          }
        }
      });

      // 获取所有选项
      const allItems = container.querySelectorAll('.ant-segmented-item');
      
      allItems.forEach(item => {
        if (item instanceof HTMLElement) {
          // 检查是否为选中状态
          const isSelected = item.classList.contains('ant-segmented-item-selected') || 
                            item.getAttribute('aria-selected') === 'true' ||
                            item.querySelector('[aria-selected="true"]') !== null ||
                            item.querySelector('input:checked') !== null;

          if (isSelected) {
            // 强制应用选中状态样式 - 使用多种方式确保生效
            const primaryColor = 'var(--tech-primary)';
            const styles = {
              'background': primaryColor,
              'background-color': primaryColor,
              'color': '#ffffff',
              'box-shadow': '0 2px 8px rgba(64, 158, 255, 0.3)',
              'font-weight': '600',
              'border': 'none',
              'z-index': '10',
              'border-radius': '6px'
            };

            Object.entries(styles).forEach(([prop, value]) => {
              item.style.setProperty(prop, value, 'important');
            });

            // 也对内部元素应用样式
            const label = item.querySelector('.ant-segmented-item-label');
            if (label instanceof HTMLElement) {
              label.style.setProperty('color', '#ffffff', 'important');
              label.style.setProperty('font-weight', '600', 'important');
            }
          } else {
            // 未选中状态
            const styles = {
              'background': 'transparent',
              'background-color': 'transparent',
              'color': 'var(--text-color-secondary)',
              'box-shadow': 'none',
              'font-weight': '500',
              'border': 'none'
            };

            Object.entries(styles).forEach(([prop, value]) => {
              item.style.setProperty(prop, value, 'important');
            });

            // 也对内部元素应用样式
            const label = item.querySelector('.ant-segmented-item-label');
            if (label instanceof HTMLElement) {
              label.style.setProperty('color', 'var(--text-color-secondary)', 'important');
              label.style.setProperty('font-weight', '500', 'important');
            }
          }
        }
      });

      // 添加事件监听器，确保选中状态在交互后保持
      const items = container.querySelectorAll('.ant-segmented-item');
      items.forEach(item => {
        if (item instanceof HTMLElement) {
          const applyStyles = () => {
            setTimeout(() => {
              const isSelected = item.classList.contains('ant-segmented-item-selected') || 
                                item.getAttribute('aria-selected') === 'true' ||
                                item.querySelector('[aria-selected="true"]') !== null ||
                                item.querySelector('input:checked') !== null;

              if (isSelected) {
                const primaryColor = 'var(--tech-primary)';
                const styles = {
                  'background': primaryColor,
                  'background-color': primaryColor,
                  'color': '#ffffff',
                  'box-shadow': '0 2px 8px rgba(64, 158, 255, 0.3)',
                  'font-weight': '600',
                  'border': 'none',
                  'z-index': '10',
                  'border-radius': '6px'
                };

                Object.entries(styles).forEach(([prop, value]) => {
                  item.style.setProperty(prop, value, 'important');
                });

                const label = item.querySelector('.ant-segmented-item-label');
                if (label instanceof HTMLElement) {
                  label.style.setProperty('color', '#ffffff', 'important');
                  label.style.setProperty('font-weight', '600', 'important');
                }
              } else {
                const styles = {
                  'background': 'transparent',
                  'background-color': 'transparent',
                  'color': 'var(--text-color-secondary)',
                  'box-shadow': 'none',
                  'font-weight': '500',
                  'border': 'none'
                };

                Object.entries(styles).forEach(([prop, value]) => {
                  item.style.setProperty(prop, value, 'important');
                });

                const label = item.querySelector('.ant-segmented-item-label');
                if (label instanceof HTMLElement) {
                  label.style.setProperty('color', 'var(--text-color-secondary)', 'important');
                  label.style.setProperty('font-weight', '500', 'important');
                }
              }
            }, 10);
          };

          // 监听各种事件
          ['click', 'focus', 'blur', 'mouseenter', 'mouseleave', 'change'].forEach(event => {
            item.addEventListener(event, applyStyles);
          });

          // 也监听内部input的change事件
          const input = item.querySelector('input');
          if (input) {
            input.addEventListener('change', applyStyles);
          }

          // 使用MutationObserver监听属性变化
          const observer = new MutationObserver(applyStyles);
          observer.observe(item, {
            attributes: true,
            attributeFilter: ['class', 'aria-selected'],
            subtree: true
          });
        }
      });
    });
  }, 50);
};

// 监听DOM变化，自动修复新添加的Segmented组件
export const setupSegmentedAutoFix = () => {
  // 初始修复
  forceSegmentedSelection();

  // 设置高频检查 - 每500ms检查一次
  setInterval(forceSegmentedSelection, 500);

  // 监听页面变化
  const observer = new MutationObserver((mutations) => {
    let hasSegmentedChanges = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node instanceof Element) {
            if (node.classList.contains('ant-segmented') || 
                node.classList.contains('tech-segmented') ||
                node.querySelector('.ant-segmented, .tech-segmented')) {
              hasSegmentedChanges = true;
            }
          }
        });
      }
      
      // 也监听属性变化
      if (mutation.type === 'attributes' && mutation.target instanceof Element) {
        if (mutation.target.closest('.ant-segmented') || 
            mutation.target.closest('.tech-segmented')) {
          hasSegmentedChanges = true;
        }
      }
    });

    if (hasSegmentedChanges) {
      setTimeout(forceSegmentedSelection, 10);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'aria-selected']
  });

  // 监听点击事件，在任何点击后都检查
  document.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (target.closest('.ant-segmented') || target.closest('.tech-segmented')) {
      setTimeout(forceSegmentedSelection, 10);
      setTimeout(forceSegmentedSelection, 100);
      setTimeout(forceSegmentedSelection, 300);
    }
  });
};

// 导出默认修复函数
export default setupSegmentedAutoFix; 