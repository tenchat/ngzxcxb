// 获取ClassmateMap实例
const app = document.querySelector('.ClassmateMap').__vue__ || document.querySelector('.ClassmateMap');

// 测试亮背景(200) - 文字应为黑色
app.testTextColorAdjustment(200);

// 测试暗背景(50) - 文字应为白色
setTimeout(() => app.testTextColorAdjustment(50), 1000);

// 测试中等亮度(128) - 文字应为黑色
setTimeout(() => app.testTextColorAdjustment(128), 2000);
