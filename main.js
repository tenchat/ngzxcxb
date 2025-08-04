/**
 * 毕业同学地图应用 - 优化版
 * 功能：展示中国地图上的同学分布信息
 */

class ClassmateMap {
    constructor() {
        this.config = {
            pointSize: 20,
            pointColor: '#ff5722',
            pointHoverColor: '#ff9800',
            backgroundImages: Array.from({length: 157}, (_, i) => `./images/${i+1}.jpg`), // 图片存放在bg文件夹内，命名为1.jpg~n.jpg
            audioFiles: {
                mapClick: 'sounds/MapClick.mp3',
                menuClose: 'sounds/MenuClose.mp3',
                domainEnter: 'sounds/DomainEnter.mp3',
            }
        };
        
        this.audioElements = {};
        
        this.domElements = {
            mapContainer: document.querySelector('.map-area'),
            pointsContainer: document.querySelector('.points-container'),
            loadingOverlay: document.getElementById('loading'),
            modal: document.getElementById('modal'),
            modalTitle: document.getElementById('modal-title'),
            classmatesTable: document.querySelector('#classmates-table tbody'),
            closeBtn: document.querySelector('.close-btn')
        };
        
        this.setRandomBackground();
        this.init();
    }

    setRandomBackground() {
        const randomIndex = Math.floor(Math.random() * this.config.backgroundImages.length);
        const bgImage = this.config.backgroundImages[randomIndex];
        document.body.style.backgroundImage = `url('${bgImage}')`;
        console.log(`已设置背景图片: ${bgImage}`); // 添加日志便于调试
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
    }
    async init() {
        this.showLoading('正在加载数据...');
        
        try {
            // 并行加载地图、数据和音频
            await Promise.all([
                this.loadMap('svg/china.svg'),
                this.loadData('./data/classmates.json'),
                this.loadAudioFiles()
            ]);
            
            this.hideLoading();
        } catch (error) {
            console.error('初始化失败:', error);
            this.showLoading('加载失败，使用示例数据', 2000);
            this.useSampleData();
        }
        
        this.setupEventListeners();
    }
    
    async loadAudioFiles() {
        try {
            // 预加载所有音频文件
            await Promise.all(
                Object.entries(this.config.audioFiles).map(async ([key, path]) => {
                    const audio = new Audio(path);
                    await new Promise((resolve) => {
                        audio.addEventListener('canplaythrough', resolve, { once: true });
                        audio.addEventListener('error', resolve); // 即使加载失败也不阻塞
                    });
                    this.audioElements[key] = audio;
                    console.log(`音频文件已加载: ${path}`);
                })
            );
        } catch (error) {
            console.warn('音频预加载时出现错误:', error);
        }
    }
    
    async loadMap(mapFile) {
        try {
            const response = await fetch(mapFile);
            if (!response.ok) throw new Error('地图加载失败');
            
            const svgData = await response.text();
            this.domElements.mapContainer.insertAdjacentHTML('afterbegin', svgData);
            
            // 确保SVG正确显示
            const svg = this.domElements.mapContainer.querySelector('svg');
            if (svg) {
                svg.style.width = '100%';
                svg.style.height = 'auto';
            }
        } catch (error) {
            throw error;
        }
    }
    
    async loadData(dataFile) {
        try {
            const filePath = `./${dataFile}`;
            console.log(`正在尝试加载数据文件: ${filePath}`);
            
            const response = await fetch(filePath, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`数据加载失败，HTTP状态码: ${response.status}`);
            }
            
            // 先获取文本内容进行验证
            const textData = await response.text();
            console.log('原始JSON文本:', textData);
            
            // 验证JSON格式
            try {
                const data = JSON.parse(textData);
                if (!Array.isArray(data)) {
                    throw new Error('JSON数据格式错误：应为数组');
                }
                
                console.log('成功解析JSON数据:', data);
                this.createPoints(data);
            } catch (parseError) {
                console.error('JSON解析错误:', parseError);
                // 尝试修复常见的JSON格式问题
                const sanitizedText = textData
                    .replace(/[\u0000-\u001F]+/g, '') // 移除控制字符
                    .replace(/,\s*}/g, '}') // 修复多余的逗号
                    .replace(/,\s*]/g, ']'); // 修复多余的逗号
                
                console.log('尝试修复后的JSON:', sanitizedText);
                const fixedData = JSON.parse(sanitizedText);
                this.createPoints(fixedData);
            }
        } catch (error) {
            console.error('加载数据时出错:', error);
            throw error;
        }
    }
    
    useSampleData() {
        const sampleData = [
            {
                x: 63, y: 43,
                province: "北京",
                city: "北京市",
                classmates: [
                    {name: "张三", university: "清华大学"},
                    {name: "李四", university: "北京大学"}
                ]
            },
            {
                x: 72.6, y: 64.51,
                province: "上海",
                city: "上海市",
                classmates: [
                    {name: "王五", university: "复旦大学"},
                    {name: "赵六", university: "上海交通大学"}
                ]
            }
        ];
        
        this.createPoints(sampleData);
    }
    
    addCustomPoint(config) {
        const point = document.createElement('div');
        point.className = 'point custom-point';
        point.style.left = `${config.x}%`;
        point.style.top = `${config.y}%`;
        
        // 设置自定义图标
        if (config.icon) {
            point.style.backgroundImage = `url('${config.icon}')`;
            point.style.backgroundSize = 'contain';
        }
        
        // 存储自定义数据
        point.dataset.custom = true;
        point.dataset.title = config.title;
        point.dataset.content = JSON.stringify(config.content);
        
        point.addEventListener('click', () => {
            // 播放预加载的domainEnter音效
            if (this.audioElements.domainEnter) {
                this.audioElements.domainEnter.currentTime = 0;
                this.audioElements.domainEnter.play().catch(e => console.log('domainEnter音效播放失败:', e));
            }
            this.showCustomPointInfo(config);
        });
        
        this.domElements.pointsContainer.appendChild(point);
    }

    createPoints(data) {
        data.forEach(item => {
            const point = this.createPointElement(item);
            this.domElements.pointsContainer.appendChild(point);
        });

        // 添加自定义标记点
        const customPoint = {
            x: "62.04",
            y: "50.65",
            icon: 'images/tp3.png',
            title: '河北南宫中学',
            content: [
                '语文老师: 郝慧',
                `数学老师: 徐丽聘`,
                '英语老师: 聂书雪',
                '物理老师: 李庆申',
                '化学老师: 云桂娟',
                '生物老师: 杜美珍',
            ],
            custom: true
        };
        this.addCustomPoint(customPoint);
    }
    
    createPointElement(data) {
        const point = document.createElement('div');
        point.className = 'point';
        point.style.left = `${data.x}%`;
        point.style.top = `${data.y}%`;
        
        // 存储数据以便后续使用
        point.dataset.province = data.province;
        point.dataset.city = data.city;
        point.dataset.classmates = JSON.stringify(data.classmates);
        point.dataset.count = data.classmates.length; // 添加同学数量
        
        // 为特定城市设置不同图片
        if (data.city === '北京市') { // 示例：为北京使用tp1.png
            point.style.backgroundImage = 'url("./images/tp1.png")';
        } 
        //else if (data.city === '上海市') { // 示例：为上海使用tp3.png
            //point.style.backgroundImage = 'url("images/tp3.png")';}
        // 其他城市保持默认tp2.png
        
        point.addEventListener('mouseenter', () => {
            // 确保没有其他提示显示
            document.querySelectorAll('.point::after').forEach(el => {
                el.style.opacity = '0';
            });
        });
        
        point.addEventListener('click', () => {
            // 播放预加载的点击音效
            if (this.audioElements.mapClick) {
                this.audioElements.mapClick.currentTime = 0; // 重置播放位置
                this.audioElements.mapClick.play().catch(e => console.log('音效播放失败:', e));
            }
            this.showClassmateInfo(data);
        });
        
        return point;
    }
    getRandomImage() {
        const imageCount = 157; // 假设images文件夹下有1.jpg~3.jpg
        const randomIndex = Math.floor(Math.random() * imageCount) + 1;
        return `./images/${randomIndex}.jpg`;
    }

    showCustomPointInfo(config) {
        // 播放预加载的domainEnter音效
        if (this.audioElements.domainEnter) {
            this.audioElements.domainEnter.currentTime = 0;
            this.audioElements.domainEnter.play().catch(e => console.log('domainEnter音效播放失败:', e));
        }
        
        // 设置模态框标题
        this.domElements.modalTitle.textContent = config.title;
        
        // 清空并重建表格
        const table = this.domElements.classmatesTable;
        table.innerHTML = '';
        table.style.tableLayout = 'fixed';
        table.style.width = '100%';
        
        // 创建tbody
        const tbody = document.createElement('tbody');
        tbody.className = 'custom-point-table';
        tbody.style.display = 'table';
        tbody.style.width = '100%';
        
        // 计算最大列数
        let maxColumns = 2;
        config.content.forEach(item => {
            const columns = item.split(':').length;
            if (columns > maxColumns) maxColumns = columns;
        });
        
        config.content.forEach(item => {
            const tr = document.createElement('tr');
            const parts = item.split(':').map(s => s.trim());
            
            // 动态创建每列
            parts.forEach((part, index) => {
                const td = document.createElement('td');
                td.textContent = part + (index < parts.length - 1 ? ':' : '');
                td.style.textAlign = 'center';
                td.style.fontFamily = '隶书, SimLi, sans-serif';
                td.style.width = `${100/maxColumns}%`; // 根据最大列数平均分配宽度
                td.style.padding = '8px';
                td.style.wordBreak = 'break-word';
                tr.appendChild(td);
            });
            
            // 补充缺失的列以保持对齐
            while (parts.length < maxColumns) {
                const td = document.createElement('td');
                td.style.width = `${100/maxColumns}%`;
                tr.appendChild(td);
                parts.push('');
            }
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        
        // 显示模态框
        this.domElements.modal.style.display = 'flex';
    }

    showClassmateInfo(data) {
        // 设置随机弹窗背景
        const modalBody = this.domElements.modal.querySelector('.modal-body');
        const bgImage = `url('${this.getRandomImage()}')`;
        modalBody.style.backgroundImage = bgImage;
        modalBody.style.backgroundSize = 'cover';
        modalBody.style.backgroundPosition = 'center';
        modalBody.style.opacity = '0.8';
        
        // 更新模态框标题
        this.domElements.modalTitle.textContent = `${data.province}-${data.city}`;
        
        // 更新同学数量
        const countElement = document.getElementById('classmate-count');
        countElement.textContent = `共${data.classmates.length}名同学`;
        
        // 清空表格
        this.domElements.classmatesTable.innerHTML = '';
        
        // 如果不是自定义弹窗，添加表头
        if (!data.custom) {
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>姓名</th>
                    <th>大学</th>
                    <th>地址</th>
                </tr>
            `;
            this.domElements.classmatesTable.appendChild(thead);
        }
        
        // 填充同学数据
        const tbody = document.createElement('tbody');
        data.classmates.forEach(classmate => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${classmate.name}</td>
                <td>${classmate.university}</td>
                <td>${classmate.address}</td>
            `;
            tbody.appendChild(row);
        });
        this.domElements.classmatesTable.appendChild(tbody);
        
        // 分析背景亮度并调整文字颜色
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = this.getRandomImage();
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 100;
            canvas.height = 100;
            ctx.drawImage(this, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let brightness = 0;
            
            // 采样计算平均亮度
            for (let i = 0; i < data.length; i += 16) {
                brightness += (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
            }
            brightness = brightness / (data.length / 16);
            
            // 调整所有文字元素的颜色
            const textElements = document.querySelectorAll('.modal-body *');
            const textColor = brightness > 128 ?' #FFFFFF' : '#000000';
            
            textElements.forEach(el => {
                if (el.textContent && el.textContent.trim() !== '') {
                    el.style.color = textColor;
                    // 根据文字颜色设置发光效果
                    if (brightness > 128) {
                        // 黑色文字使用白色发光效果
                        el.style.textShadow = `
                            0 0 2px rgba(0,0,0,0.8),
                            0 0 4px rgba(0,0,0,0.5)                            
                        `;
                    } else {
                        // 白色文字使用黑色发光效果
                        el.style.textShadow = `
                            0 0 2px rgba(255,255,255,0.8),
                            0 0 4px rgba(255,255,255,0.5),
                        `;
                    }
                    // 移除之前设置的背景色和内边距
                    el.style.backgroundColor = '';
                    el.style.padding = '';
                    el.style.borderRadius = '';
                }
            });
            
            // 特别处理表头行，强制设置为透明背景
            const tableHeaders = document.querySelectorAll('.modal-body th');
            tableHeaders.forEach(th => {
                th.style.backgroundColor = 'transparent';
                th.style.setProperty('background-color', 'transparent', 'important');
            });
        };
        
        // 显示模态框
        this.domElements.modal.style.display = 'flex';
    }
    
    showLoading(message, duration = 0) {
        this.domElements.loadingOverlay.style.display = 'flex';
        this.domElements.loadingOverlay.querySelector('p').textContent = message;
        
        if (duration > 0) {
            setTimeout(() => this.hideLoading(), duration);
        }
    }
    
    hideLoading() {
        this.domElements.loadingOverlay.style.display = 'none';
    }
    
    setupEventListeners() {
        // 关闭模态框
        this.domElements.closeBtn.addEventListener('click', () => {
            // 播放预加载的关闭音效
            if (this.audioElements.menuClose) {
                this.audioElements.menuClose.currentTime = 0; // 重置播放位置
                this.audioElements.menuClose.play().catch(e => console.log('关闭音效播放失败:', e));
            }
            this.domElements.modal.style.display = 'none';
        });
        
        // 点击模态框外部关闭
        this.domElements.modal.addEventListener('click', (e) => {
            if (e.target === this.domElements.modal) {
                // 播放预加载的关闭音效
                if (this.audioElements.menuClose) {
                    this.audioElements.menuClose.currentTime = 0;
                    this.audioElements.menuClose.play().catch(e => console.log('关闭音效播放失败:', e));
                }
                this.domElements.modal.style.display = 'none';
            }
        });
        
        // 检查屏幕方向
        this.checkOrientation();
        window.addEventListener('resize', () => this.checkOrientation());
    }
    checkOrientation() {
        // 检测是否为移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) return;
        
        // 检查当前会话是否已经显示过提示
        if (sessionStorage.getItem('orientationHintShown')) {
            return;
        }
        
        const warning = document.getElementById('orientation-warning');
        const isPortrait = window.innerHeight > window.innerWidth;
        
        // 显示提示，内容根据方向变化
        warning.style.display = 'block';
        warning.querySelector('p').textContent = isPortrait 
            ? '请转至横屏以获得最佳体验！'
            : '请保持横屏以获得最佳体验！';

        // 标记为当前会话已显示
        sessionStorage.setItem('orientationHintShown', 'true');
        
        // 10秒后自动隐藏
        setTimeout(() => {
            warning.style.display = 'none';
        }, 10000);
        
        // 点击任意位置关闭
        document.addEventListener('click', () => {
            warning.style.display = 'none';
        }, { once: true });
    }
}

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ClassmateMap();
});