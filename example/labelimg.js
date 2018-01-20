var Labelimg = (function () {
	var _self; // 该插件内的全局变量，用来获取 this
	var _xaxis, _yaxis;

	function Labelimg(opt) {
		this.el = opt.el;
		this.shape = opt.shape || 'polygon';

		this.x = 0;
		this.y = 0;
		this.kx = 1;
		this.ky = 1;
		this.imgWidth = 0;
		this.imgHeight = 0;

		this.color_active = '#ff0000'; // 当前标注所使用的颜色
		this.polygonConfig = {
			points: [],
			stack: []
		}
		this.labelsConfig = {
			stack: []
		}
		this.outputData = []
		_self = this;

		this.TOOLS = [
			{ NAME: 'magnify', ICON: '\u29FE', TITLE: '放大' },
			{ NAME: 'shrink', ICON: '\u29FF', TITLE: '缩小' },
			{ NAME: 'repeal', ICON: '\u23F4', TITLE: '撤销' },
			{ NAME: 'clean', ICON: '\u27F3', TITLE: '清空' }
		]
		this.COLORS = ['#ff0000', '#00db00', '#f9f900', '#0072e3']
		render.call(this)
		draw.call(this)
	}

	Labelimg.prototype = {
		addImg: function (src) {
			var img = document.querySelector('.lbi-img');
			if (!img) {
				img = document.createElement('img');
				img.className = 'lbi-img';
			}
			img.src = src;
			img.onload = function () {
				var svg = document.querySelector('.lbi-svg');
				// 保存图片原始尺寸，当图片放大或缩小后，需要与原始尺寸对比，计算比例系数
				_self.imgWidth = img.clientWidth;
				_self.imgHeight = img.clientHeight;
				svg.setAttribute('viewBox', '0, 0, ' + _self.imgWidth + ', ' + _self.imgHeight);

				// 初始化图片大小，让图片和父元素一样宽，提高体验
				img.style.width = img.clientWidth > img.parentNode.clientWidth ? 
					img.parentNode.clientWidth + 'px' :
					img.clientWidth + 'px';
				syncSize(img,svg)
			}
			// clean(svg)
		},
		output: function () {
			var _svg = document.getElementById('lbi-svg');
			var outputData = []
			Array.prototype.forEach.call(_svg.children, function (item, index) {
				var dataItem = {};
				dataItem.index = index + 1;
				dataItem.position = JSON.parse(item.dataset.position);
				outputData.push(dataItem)
			})
			return outputData;
		}
	}

	function render() {
		// 获取 整体 UI 框架的 html 结构字符串并渲染
		this.el.innerHTML = render.ui();
		
		// 获取 toolbox 的 html 结构字符串并渲染
		document.querySelector('.lbi-tool-box').innerHTML = render.toolBox(this.TOOLS);
		tool()

		// 获取 svgbox 的 html 结构字符串并渲染
		// 
		// colorBox
		document.querySelector('.lbi-color-box').innerHTML = render.colorBox(this.COLORS);
		render.handleColor()
		// renderToolbar(target, tools)
		// renderBoard(target)
		// renderLabels(target)
		// renderTip(target)
		// render.axisSetting(document.querySelector('.lbi-paint-box'))
	}
	// 整体UI框架的 html 结构
	render.ui = function () {
		var uiHtml = `
			<div class="lbi-main">
				<div class="lbi-tool-box"></div>
				<div class="lbi-paint-box">
					<div class="lbi-svg-box">
						<img src="" alt="" class="lbi-img" />
						<svg class="lbi-svg"></svg>
					</div>
					<div class="lbi-xaxis"></div>
					<div class="lbi-yaxis"></div>
				</div>
				<div class="lbi-mask">
					<div class="lbi-select-box">
						<p class="lbi-side-tt">标注对象</p>
						<label class="lbi-select-label">
							名称：
							<select name="" id="" class="lbi-select">
								<option value="">-- 请选择 --</option>
							</select>
						</label>
						<label class="lbi-select-label">
							属性：
							<select name="" id="" class="lbi-select">
								<option value="">-- 请选择 --</option>
							</select>
						</label>
						<button class="lbi-select-btn" type="button">确认</button>
					</div>
				</div>
			</div>
			<div class="lbi-side">
				<div class="lbi-side-item">
					<p class="lbi-side-tt">颜色选择</p>
					<div class="lbi-color-box"></div>
					<p class="lbi-side-tt">标注方式</p>
					<div class="lbi-shape-box">
						<button class="lbi-shape-btn" type="button" data-shape="point">打点</button>
						<button class="lbi-shape-btn" type="button" data-shape="rect">画框</button>
						<button class="lbi-shape-btn" type="button" data-shape="polygon">描边</button>
					</div>
				</div>
				<div class="lbi-side-item">
					<p class="lbi-side-tt">标注属性</p>
					<div class="lbi-info-box"></div>
				</div>
			</div>
		`;
		return uiHtml;
	}
	// 工具栏 toolBox 内的 html 结构
	render.toolBox = function (tools) {
		var toolboxHtml = '';
		tools.forEach(function (tool) {
			toolboxHtml += `
				<span class="lbi-tool" title="${tool.TITLE}" data-action="${tool.NAME}">
					${tool.ICON}
				</span>
			`
		})
		return toolboxHtml;
	}
	// 渲染颜色选择内容
	render.colorBox = function (colors) {
		var colorHtml = '';
		colors.forEach(function (color) {
			colorHtml += `<span class="lbi-color-item" data-color="${color}" style="border-color: ${color};"></span>`
		})
		return colorHtml;
	}
	// 设置颜色选择操作
	render.handleColor = function () {
		var colors = document.querySelectorAll('.lbi-color-item');
		for(let i = 0; i < colors.length; i++) {
			colors[i].onclick = function (e) {
				_self.color_active = colors[i].style.backgroundColor = colors[i].dataset.color;
				var siblings = Array.prototype.filter.call(colors, function (item, index) {
					return item !== colors[i]
				});
				siblings.forEach(function (item) {
					item.style.backgroundColor = '#fff'
				})
			}
		}
	}
	render.handleShape = function () {
		var shapes = document.querySelectorAll('.lbi-shape-btn');
		for(let i = 0; i < shapes.length; i++) {
			shapes[i].onclick = function (e) {
				_self.shape = shapes[i].dataset.shape;
			}
		}
	}
	// 设置 svg
	render.svgSetting = function (parent) {
		var _svg = document.getElementById('lbi-svg')
		_svg.style.width = parent.clientWidth + 'px';
		_svg.style.height = parent.clientHeight + 'px';
		_svg.addEventListener('mouseover', function (e) {
		})
		_svg.addEventListener('mouseout', function () {
		})
	}
	// 设置辅助轴
	render.axisSetting = function (target) {
		var xaxis = document.querySelector('.lbi-xaxis'),
			yaxis = document.querySelector('.lbi-yaxis');
		target.onmouseenter = function (e) {
			xaxis.style.top = e.offsetY +'px'
			yaxis.style.left = e.offsetX +'px'
			target.onmousemove = function (e) {
				xaxis.style.top = e.offsetY +'px'
				yaxis.style.left = e.offsetX +'px'			
			}
		}
	}

	function renderLabels(target) {
		var labels = document.createElement('ul');
		labels.className = 'paint-labels';
		target.appendChild(labels);
	}
	function renderTip(target) {
		var tip = document.createElement('div');
		tip.className = 'paint-tip';
		target.appendChild(tip)
	}

	// toobar 里每个按钮被点击后所执行的操作
	// 在 renderToolbar() 函数的末尾调用，当 toobar 渲染完毕后执行
	function tool() {
		var toolbox = document.querySelector('.lbi-tool-box');
		toolbox.addEventListener('click', function (e) {
			var target = e.target;
			// 由于渲染顺序的原因，暂时需要在点击 toolbar 里的按钮时获取 svg 和 img
			var svg = document.querySelector('.lbi-svg'),
				img = document.querySelector('.lbi-img');
			if(target.tagName.toLowerCase() === 'span') {
				var action = target.dataset.action;
				tool[action](img, svg)
			}
		})
	}
	tool.magnify = function (img, svg) {
		img.style.width = img.clientWidth + 100 + 'px';
		// svg 与标注图同步大小
		syncSize(img, svg)

	}
	tool.shrink = function (img, svg) {
		img.style.width = img.clientWidth - 100 + 'px';
		// svg 与标注图同步大小
		syncSize(img, svg)
	}
	tool.repeal = function () {
		var _svg = document.getElementById('lbi-svg');
		var _labels = document.getElementsByClassName('paint-labels')[0];
		if (_self.polygonConfig.stack.length > 0) {
			_svg.removeChild(_self.polygonConfig.stack[_self.polygonConfig.stack.length - 1])
			_self.polygonConfig.points.pop()
			_self.polygonConfig.stack.pop()

			return;
		}

		if (_svg.lastChild) {
			_svg.removeChild(_svg.lastChild)
			_labels.removeChild(_labels.lastChild)
		}
	}
	tool.clean = function () {
		var _svg = document.getElementById('lbi-svg');
		var _labels = document.getElementsByClassName('paint-labels')[0];
		_labels.innerHTML = ''
		_svg.innerHTML = ''
		_self.polygonConfig.points = []
		_self.polygonConfig.stack = [];
	}
	// 同步标注图片和 svg 大小，使两者保持一致
	function syncSize(img,svg) {
		// svg 跟随图片一起缩放时，需要计算出 svg 缩放前后的宽高比例系数
		// 并且以后的坐标都会乘以这个系数，否则绘制的坐标是错误的
		svg.style.width = img.clientWidth + 'px';
		svg.style.height = img.clientHeight + 'px';
		_self.kx = _self.imgWidth / img.clientWidth
		_self.ky = _self.imgHeight / img.clientHeight
	}


	// 绘制图形的方法
	function draw() {
		var svg = document.querySelector('.lbi-svg');

		switch (_self.shape) {
			case 'point':
				drawPoint(svg)
				break;
			case 'rect':
				drawRect(svg)
				break;
			case 'polygon':
				drawPolygon(svg)
				break;
			default:
				// statements_def
				break;
		}
		
	}
	function drawPoint(parent, attrs) {
		parent.addEventListener('mousedown', function (e){
			_self.x = e.offsetX * _self.kx;
			_self.y = e.offsetY * _self.ky;
			var attrs = {
				'cx': _self.x,
				'cy': _self.y,
				'r': 2,
				'stroke': 'yellow',
				'fill': _self.color_active,
				'data-index': parent.children.length,
				'data-position': `[${_self.x}, ${_self.y}]`
			};
			var point = createPoint(attrs)
			parent.appendChild(point)

			createLabelsItem(parent.children.length)
		},false)

	}
	function drawRect(parent) {
		var x, y, width, height;
		parent.onmousedown = function (e) {
			_self.x = e.offsetX * _self.kx;
			_self.y = e.offsetY * _self.ky;
			var attrs = {
				x: _self.x,
				y: _self.y,
				width: 0,
				height: 0,
				stroke: _self.color_active,
				style: 'fill:none;stroke-width:1'
			}
			var rect = createRect(attrs)
			parent.appendChild(rect)
			parent.onmousemove = function (e) {
				e.offsetX * _self.kx > _self.x ? x = _self.x : x = e.offsetX * _self.kx
				e.offsetY * _self.ky > _self.y ? y = _self.y : y = e.offsetY * _self.ky
				width = Math.abs(e.offsetX * _self.kx - _self.x)
				height = Math.abs(e.offsetY * _self.ky - _self.y)
				rect.setAttribute('x', x)
				rect.setAttribute('y', y)
				rect.setAttribute('width', width)
				rect.setAttribute('height', height)
			}
			parent.onmouseup = function (e) {
				parent.onmousemove = null;
				x = parseInt(x,10)
				y = parseInt(y,10)
				width = parseInt(width,10)
				height = parseInt(height,10)

				rect.setAttribute('data-position', '[[' + x + ',' + y + '], [' + (x + width) + ',' + y + '], [' + (x + width) + ',' + (y + height) + '], [' + x + ',' + (y + height) + ']]');
				rect.setAttribute('data-index', parent.children.length);
				if (_self.x === e.offsetX * _self.kx && _self.y === e.offsetY * _self.ky) {
					parent.removeChild(rect);
					return;
				}

				createLabelsItem(parent.children.length);
			}
		}
	}
	function drawPolygon(parent) {
		// 绘制栈，保存起始点和每条线的 DOM 节点，当多边形绘制完毕后，需要删除之前的circle和line节点
		parent.addEventListener('click', function (e) {
			if(e.target.tagName === 'circle') {
				var points = _self.polygonConfig.points.join(' ')
				var polygon = createPolygon(points)
				polygon.setAttribute('data-position', JSON.stringify(_self.polygonConfig.points))
				parent.appendChild(polygon)
				_self.polygonConfig.stack.forEach(function (item) {
					parent.removeChild(item)
				})
				polygon.setAttribute('data-index', parent.children.length)
				createLabelsItem(parent.children.length)
				_self.polygonConfig.stack = []
				_self.polygonConfig.points = []
			} else {
				// 传给图形的坐标参数，需要乘以 svg 缩放前后的宽高比例系数
				_self.x = e.offsetX * _self.kx;
				_self.y = e.offsetY * _self.ky;
				_self.polygonConfig.points.push([_self.x, _self.y])
				var pointsLen = _self.polygonConfig.points.length;
				if (pointsLen === 1) {
					var attrs = {
						'cx': _self.x,
						'cy': _self.y,
						'r': 4,
						'stroke': 'black',
						'fill': _self.color_active
					};
					var circle = createPoint(attrs)
					this.appendChild(circle)
					_self.polygonConfig.stack.push(circle)
					return;
				}
				if(pointsLen > 1) {
					var attrs = {
						'x1': _self.polygonConfig.points[pointsLen - 2][0],
						'y1': _self.polygonConfig.points[pointsLen - 2][1],
						'x2': _self.polygonConfig.points[pointsLen - 1][0],
						'y2': _self.polygonConfig.points[pointsLen - 1][1],
						'stroke': _self.color_active,
						'style': 'stroke-width:1'
					}
					var line = createLine(attrs)
					this.appendChild(line)
					_self.polygonConfig.stack.push(line)
				}				
			}
		})
	}

	// 创建 svg 图形
	/**
	 * 创建 圆形
	 * @param  {Object} attrs     圆的 html 属性
	 * @return {DOM Node}     DOM节点
	 */
	function createPoint(attrs) {
		var circle = makeElementNS('circle', attrs)
		circle.addEventListener('mouseover', function (e) {
			e.target.setAttribute('r', 10)
		})
		circle.addEventListener('mouseout', function (e) {
			e.target.setAttribute('r', attrs.r)
		})
			
		return circle;
	}
	function createLine(attrs) {
		var line = makeElementNS('line', attrs)

		return line;
	}
	function createRect(attrs) {
		var rect = makeElementNS('rect', attrs)

		return rect;
	}
	function createPolygon(points) {
		var opt = {
			points: points,
			fill: _self.color_active,
			style: 'stroke:purple;stroke-width:1;opacity:.3'
		};
		var polygon = makeElementNS('polygon', opt)

		return polygon;
	}

	// 创建标注对象属性
	function createLabelsItem(index) {
		var item = document.createElement('li');
		item.className = 'labels-item';
		var itemStr = `
			<span>${index}</span>
			<input type="text">
		`
		item.innerHTML = itemStr;
		_self.labelsConfig.stack.push(item)
		var labels = document.getElementsByClassName('paint-labels')[0]
		labels.appendChild(item)

		var input = item.getElementsByTagName('input')[0]
		input.onchange = function (e) {
			var _svg = document.getElementById('lbi-svg');
			_svg.children[index-1].setAttribute('data-name', input.value)
		}
	}
	/**
	 * 创建 XML 元素
	 */
	function makeElementNS(name, attrs) {
		var ns = 'http://www.w3.org/2000/svg';
		var ele = document.createElementNS(ns, name);
		for (var k in attrs) {
			if(attrs.hasOwnProperty(k)) {
				ele.setAttribute(k, attrs[k])
			}
		}

		return ele;
	}
	return Labelimg;
})()