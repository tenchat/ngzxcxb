// 全局变量和配置
const config = {
    currentBgIndex: 1,
    maxBgImages: 10, // 背景图数量
    pointSize: 20,   // 标点大小(px)
    pointColor: '#ff5722' // 标点颜色
};

// 初始化函数
async function init() {
    // 加载背景图
    loadBackground();
    
    // 加载中国地图
    loadChinaMap();
    
    // 显示加载状态
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading';
    loadingIndicator.textContent = '正在加载数据...';
    loadingIndicator.style.position = 'fixed';
    loadingIndicator.style.top = '20px';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translateX(-50%)';
    loadingIndicator.style.padding = '10px 20px';
    loadingIndicator.style.background = 'rgba(0,0,0,0.7)';
    loadingIndicator.style.color = 'white';
    loadingIndicator.style.borderRadius = '5px';
    document.body.appendChild(loadingIndicator);
    
    try {
        // 从JSON文件加载数据
        const response = await fetch('data/classmates.json');
        if (!response.ok) throw new Error('数据加载失败');
        
        const classmatesData = await response.json();
        addPoints(classmatesData);
        
        loadingIndicator.textContent = '数据加载完成';
        setTimeout(() => {
            loadingIndicator.remove();
        }, 1000);
    } catch (error) {
        console.error('初始化错误:', error);
        loadingIndicator.textContent = '数据加载失败，使用示例数据';
        
        // 使用内置示例数据作为后备
        const exampleData = [
            {
                x: 30, y: 40,
                province: "北京",
                city: "北京市",
                classmates: [
                    {name: "张三", university: "清华大学"},
                    {name: "李四", university: "北京大学"}
                ]
            },
            {
                x: 60, y: 70,
                province: "上海",
                city: "上海市",
                classmates: [
                    {name: "王五", university: "复旦大学"},
                    {name: "赵六", university: "上海交通大学"}
                ]
            }
        ];
        
        addPoints(exampleData);
        
        setTimeout(() => {
            loadingIndicator.remove();
        }, 2000);
    }
}

// 加载背景图
function loadBackground() {
    document.body.style.backgroundImage = `url('bg.jpg')`;
}

// 加载中国地图
function loadChinaMap() {
    const mapContainer = document.getElementById('map-container');
    
    // 使用fetch加载SVG地图
    fetch('China_map.svg')
        .then(response => response.text())
        .then(svgData => {
            mapContainer.innerHTML = svgData;
            // 确保SVG填充容器
            const svg = mapContainer.querySelector('svg');
            if (svg) {
                svg.style.width = '100%';
                svg.style.height = 'auto';
            }
        })
        .catch(error => {
            console.error('加载地图失败:', error);
            mapContainer.innerHTML = '<div class="map-error">无法加载地图，请确保china.svg文件存在</div>';
        });
}

// 添加标点到地图
function addPoints(data) {
    const mapContainer = document.getElementById('map-container');
    
    data.forEach(item => {
        const point = createPointElement(item);
        mapContainer.appendChild(point);
    });
}

// 创建标点元素
function createPointElement(data) {
    const point = document.createElement('div');
    point.className = 'point';
    point.style.left = `${data.x}%`;
    point.style.top = `${data.y}%`;
    point.style.width = `${config.pointSize}px`;
    point.style.height = `${config.pointSize}px`;
    point.style.backgroundColor = config.pointColor;
    
    // 添加数据属性以便调试
    point.dataset.province = data.province;
    point.dataset.city = data.city;
    
    point.addEventListener('click', () => {
        playSound(data.city);
        showModal(data);
    });
    
    return point;
}

// 播放声音
function playSound(cityName) {
    return new Promise((resolve) => {
        const audio = new Audio(`sounds/${cityName}.mp3`);
        audio.play()
            .then(() => {
                audio.addEventListener('ended', resolve);
            })
            .catch(e => {
                console.log('音频播放被阻止:', e);
                resolve(); // 即使播放失败也继续执行
            });
    });
}

// 显示模态框
async function showModal(data) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const tableBody = document.querySelector('#classmates-table tbody');
    
    // 播放声音
    await playSound(data.city);
    
    // 设置标题
    modalTitle.textContent = `${data.province}-${data.city}`;
    
    // 清空表格
    tableBody.innerHTML = '';
    
    // 填充数据
    data.classmates.forEach(classmate => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${classmate.name}</td>
            <td>${classmate.university}</td>
        `;
        tableBody.appendChild(row);
    });
    
    // 随机设置模态框背景
    const randomBgIndex = Math.floor(Math.random() * config.maxBgImages) + 1;
    document.querySelector('.modal-header').style.backgroundImage = `url('images/${randomBgIndex}.jpg')`;
    
    // 显示模态框
    modal.style.display = 'flex';
    
    // 点击模态框外部关闭
    const closeModal = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            modal.removeEventListener('click', closeModal);
        }
    };
    modal.addEventListener('click', closeModal);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
