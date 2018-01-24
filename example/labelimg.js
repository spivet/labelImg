var Labelimg = (function () {
	var _self; // 该插件内的全局变量，用来获取 this

	function Labelimg(opt) {
		this.el = opt.el;
		this.shape = opt.shape || 'polygon';
		this.labelObj = opt.labelObj || { names: [], labels: [] };
		this.isGroup = opt.isGroup || false;

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

		// 输出数据
		this.outputData = []
		// 默认工具，暂时不可更改
		this.TOOLS = [
			{ NAME: 'magnify', ICON: '\u29FE', TITLE: '放大' },
			{ NAME: 'shrink', ICON: '\u29FF', TITLE: '缩小' },
			{ NAME: 'repeal', ICON: '\u23F4', TITLE: '撤销' },
			{ NAME: 'clean', ICON: '\u27F3', TITLE: '清空' }
		]
		// 默认颜色，暂时不可更改
		this.COLORS = ['#ff0000', '#00db00', '#f9f900', '#0072e3']
		// 把 this 赋给 _self，以便在函数内调用
		_self = this;

		render.call(this)
		draw()
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
				_self.imgWidth = img.naturalWidth;
				_self.imgHeight = img.naturalHeight;
				svg.setAttribute('viewBox', '0, 0, ' + _self.imgWidth + ', ' + _self.imgHeight);

				// 初始化图片大小，让图片和父元素一样宽，提高体验
				img.style.width = img.naturalWidth > img.parentNode.clientWidth ? 
					img.parentNode.clientWidth + 'px' :
					img.naturalWidth + 'px';
				syncSize(img,svg)
				tool.clean()
			}
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

		// colorBox
		document.querySelector('.lbi-color-box').innerHTML = render.colorBox(this.COLORS);
		render.handleColor()
		render.handleShape()

		// 获取 selectBox 的 html 结构字符串并渲染
		var selectHtml = render.selectBox(this.labelObj);
		document.getElementById('lbi-select-names').innerHTML = selectHtml.namesHtml;
		document.getElementById('lbi-select-labels').innerHTML = selectHtml.labelsHtml;
		render.handleSelect()
		// renderToolbar(target, tools)
		// renderBoard(target)
		// renderLabels(target)
		// renderTip(target)
		render.axisSetting(document.querySelector('.lbi-svg-box'))

		// 整体结构渲染完后，给 DOM 节点绑定处理事件
		handle()
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
					<svg class="lbi-axis">
						<line x1="0" y1="0" x2="870" y2="0" style="stroke:#1c79c6;stroke-width:2" />
						<line x1="0" y1="0" x2="0" y2="550" style="stroke:#1c79c6;stroke-width:2" />
					</svg>
				</div>
				<div class="lbi-mask">
					<div class="lbi-select-box">
						<div class="lbi-side-tt">标注对象</div>
						<label class="lbi-select-label">
							名称：
							<select name="" id="lbi-select-names" class="lbi-select"></select>
						</label>
						<label class="lbi-select-label">
							标签：
							<select name="" id="lbi-select-labels" class="lbi-select"></select>
						</label>
						<button class="lbi-select-btn lbi-select-btn-submit" type="button">确认</button>
						<button class="lbi-select-btn lbi-select-btn-close" type="button">取消</button>
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
						<button class="lbi-shape-btn" type="button" data-shape="polyline">画线</button>
					</div>
				</div>
				<div class="lbi-side-item">
					<div class="lbi-side-tt">
						标注信息
						<span class="lbi-group-btn">生成组</span>
					</div>
					<div class="lbi-info-box"></div>
				</div>
			</div>
		`;
		return uiHtml;
	}
	// 工具栏 lbi-tool-box 内的 html 结构
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
	 // 标注对象 lbi-select-box 的名称和属性 html 结构
	render.selectBox = function (labelObj) {
		var namesHtml = '<option value="">-- 请选择 --</option>';
		labelObj.names.forEach(function (name) {
			namesHtml += `<option value="${name}">${name}</option>`
		})

		var labelsHtml = '<option value="">-- 请选择 --</option>';
		labelObj.labels.forEach(function (label) {
			labelsHtml += `<option value="${label}">${label}</option>`
		})

		return { namesHtml, labelsHtml };
	}
	// 颜色选择 lbi-color-box 的 html 结构
	render.colorBox = function (colors) {
		var colorHtml = '';
		colors.forEach(function (color) {
			colorHtml += `<span class="lbi-color-item" data-color="${color}" style="border-color: ${color};"></span>`
		})
		return colorHtml;
	}
	// 标注信息 lbi-info-box 的 html 结构
	render.infoBox = function (name, label) {
		var infoItem = document.createElement('div');
		infoItem.className = 'lbi-info-item';

		var infoHtml = `
			<p class="lbi-info-name"><b>名称：</b>${name}</p>
			<p class="lbi-info-label"><b>标签：</b>${label}</p>
		`;
		infoItem.innerHTML = infoHtml
		return infoItem;
	}
	// 标注对象弹出框操作
	render.handleSelect = function () {
		// 点击确认按钮的操作
		var submit = document.querySelector('.lbi-select-btn-submit');
		submit.onclick = function () {
			// 获取标注对象弹出层的值并渲染标注信息
			var name = document.getElementById('lbi-select-names').value,
				label = document.getElementById('lbi-select-labels').value;
			var infoItem = render.infoBox(name, label);
			document.querySelector('.lbi-info-box').appendChild(infoItem);

			// _self.labelsConfig.stack.push(infoItem)
			var svg = document.querySelector('.lbi-svg'),
				len = svg.children.length;
			svg.children[len-1].setAttribute('data-name', name)
			svg.children[len-1].setAttribute('data-label', label);
			handleInfo()
			// 还原标注对象弹出层并关闭
			document.getElementById('lbi-select-names').value = '';
			document.getElementById('lbi-select-labels').value = '';
			document.querySelector('.lbi-mask').style.display = 'none';
		}
		// 点击取消按钮的操作
		var close = document.querySelector('.lbi-select-btn-close');
		close.onclick = function () {
			var svg = document.querySelector('.lbi-svg');
			svg.removeChild(svg.lastChild)

			// 还原标注对象弹出层并关闭
			document.getElementById('lbi-select-names').value = '';
			document.getElementById('lbi-select-labels').value = '';
			document.querySelector('.lbi-mask').style.display = 'none';
		}
	}
	// 标注信息操作
	function handleInfo()  {
		var infoItems = document.querySelectorAll('.lbi-info-item'),
			notg = document.querySelectorAll('.svg-child-not-g');
		for(let i = 0; i < infoItems.length; i++) {
			infoItems[i].onmouseenter = function (e) {
				notg[i].style.strokeWidth = 10
			}
			infoItems[i].onmouseleave = function (e) {
				notg[i].style.strokeWidth = 1
			}
		}
	}

	// 设置颜色选择操作
	render.handleColor = function () {
		var active = document.querySelector('span[data-color="'+ _self.color_active +'"]')
		active.style.backgroundColor = _self.color_active
		var colors = document.querySelectorAll('.lbi-color-item');
		for(let i = 0; i < colors.length; i++) {
			colors[i].onclick = function (e) {
				_self.color_active = colors[i].style.backgroundColor = colors[i].dataset.color;
				var siblings = getSiblings(colors, colors[i])
				siblings.forEach(function (item) {
					item.style.backgroundColor = '#fff'
				})
			}
		}
	}
	// 标注方式操作
	render.handleShape = function () {
		var active = document.querySelector('button[data-shape="'+ _self.shape +'"]')
		active.style.backgroundColor = '#e6e6e6'
		active.style.border = '1px solid #adadad'
		var shapes = document.querySelectorAll('.lbi-shape-btn');
		for(let i = 0; i < shapes.length; i++) {
			shapes[i].onclick = function (e) {
				_self.shape = shapes[i].dataset.shape;
				shapes[i].style.backgroundColor = '#e6e6e6'
				shapes[i].style.border = '1px solid #adadad'
				var siblings = getSiblings(shapes, shapes[i])
				siblings.forEach(function (item) {
					item.style.backgroundColor = '#fff'
					item.style.border = '1px solid #ccc'
				})
				draw()
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
		var axis = document.querySelector('.lbi-axis'),
			xaxis = axis.firstElementChild,
			yaxis = axis.lastElementChild;
		target.onmousemove = function (e) {
			xaxis.setAttribute('y1', e.offsetY - target.scrollTop)
			xaxis.setAttribute('y2', e.offsetY - target.scrollTop)
			yaxis.setAttribute('x1', e.offsetX - target.scrollLeft)
			yaxis.setAttribute('x2', e.offsetX - target.scrollLeft)
		}
	}


	// ================================================================
	// 插件里，所有元素的 DOM 相关操作
	// 工具栏 lbi-tool-box 里的几个按钮的处理事件，单独放在 tool 对象里
	// ================================================================
	function handle() {
		handle.groupBtn()
	}
	handle.groupBtn = function () {
		var create = document.querySelector('.lbi-group-btn');
		create.onclick = function () {
			var svg = document.querySelector('.lbi-svg');
			// 首先筛选出 svg 中不是 g 元素的子元素
			var notg = Array.prototype.filter.call(svg.children, function(child){
				return child.tagName.toLowerCase() !== 'g';
			});
			// 创建分组元素 g，然后把不是 g 元素的子元素放入元素 g 中，并添加到 svg 里
			var g = makeElementNS('g', { 'data-groupId': svg.children.length - notg.length + 1 });
			for(let i = 0; i < notg.length; i++) {
				if (notg[i].tagName.toLowerCase() !== 'g') {
					g.appendChild(notg[i])
				}
			}
			svg.appendChild(g)

			var infoBox = document.querySelector('.lbi-info-box');
			// 首先筛选出 lbi-info-box 中 className 不等于 lbi-info-list 的子元素
			var notInfoItem = Array.prototype.filter.call(infoBox.children, function(child){
				return child.className !== 'lbi-info-list';
			});
			// 创建分组元素 g，然后把不是 g 元素的子元素放入元素 g 中，并添加到 svg 里
			var list = document.createElement('div');
			list.className = 'lbi-info-list';
			for(let i = 0; i < notInfoItem.length; i++) {
					list.appendChild(notInfoItem[i])
			}
			infoBox.appendChild(list)
		}
	}


	// ===============================================================
	// toobar 里每个按钮被点击后所执行的操作
	// 在 renderToolbar() 函数的末尾调用，当 toobar 渲染完毕后执行
	// ===============================================================
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
		var svg = document.querySelector('.lbi-svg');
		var infoBox = document.querySelector('.lbi-info-box');
		if (_self.polygonConfig.stack.length > 0) {
			svg.removeChild(_self.polygonConfig.stack[_self.polygonConfig.stack.length - 1])
			_self.polygonConfig.points.pop()
			_self.polygonConfig.stack.pop()

			return;
		}

		if (svg.lastChild) {
			svg.removeChild(svg.lastChild)
			infoBox.removeChild(infoBox.lastChild)
		}
	}
	tool.clean = function () {
		var svg = document.querySelector('.lbi-svg');
		var infoBox = document.querySelector('.lbi-info-box');
		infoBox.innerHTML = ''
		svg.innerHTML = ''
		_self.polygonConfig.points = []
		_self.polygonConfig.stack = [];
		document.querySelector('.lbi-mask').style.display = 'none'
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


	// ============================================================
	// 绘制图形的方法
	// ============================================================
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
			case 'polyline':
				drawPolyline(svg)
				break;
			default:
				// statements_def
				break;
		}
		
	}
	function drawPoint(parent, attrs) {
		// 在执行 drawPoint 函数之前，先把上个绘制函数事件删除，否则上个绘制函数也会一直执行
		parent.onmousedown = parent.onmousemove = parent.onmouseup = null
		parent.onclick = function (e){
			_self.x = e.offsetX * _self.kx;
			_self.y = e.offsetY * _self.ky;
			var attrs = {
				'class': 'svg-child-not-g',
				'cx': _self.x,
				'cy': _self.y,
				'r': 2,
				'stroke': _self.color_active,
				'fill': _self.color_active,
				'data-index': parent.children.length - parent.getElementsByTagName('g').length + 1,
				'data-position': `[${_self.x}, ${_self.y}]`
			};
			var point = createPoint(attrs)
			parent.appendChild(point)

			document.querySelector('.lbi-mask').style.display = 'block';
		}

	}
	function drawRect(parent) {
		// 在执行 drawRect 函数之前，先把上个绘制函数事件删除，否则上个绘制函数也会一直执行
		parent.onclick = null
		var x, y, width, height;
		parent.onmousedown = function (e) {
			_self.x = e.offsetX * _self.kx;
			_self.y = e.offsetY * _self.ky;
			var attrs = {
				'class': 'svg-child-not-g',
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
			parent.onmouseup = parent.onmouseleave = function (e) {
				x = parseInt(x,10)
				y = parseInt(y,10)
				width = parseInt(width,10)
				height = parseInt(height,10)

				rect.setAttribute('data-position', '[[' + x + ',' + y + '], [' + (x + width) + ',' + y + '], [' + (x + width) + ',' + (y + height) + '], [' + x + ',' + (y + height) + ']]');
				rect.setAttribute('data-index', parent.children.length - parent.getElementsByTagName('g').length);
				if (_self.x === e.offsetX * _self.kx && _self.y === e.offsetY * _self.ky) {
					parent.removeChild(rect);
					parent.onmousemove = parent.onmouseup = parent.onmouseleave = null;
					return;
				}
				document.querySelector('.lbi-mask').style.display = 'block';
				// 删除 move 和 up 事件，否则事件会一直保留，产生副作用，比如从 svg 外部滑入抬起鼠标也会执行事件
				parent.onmousemove = parent.onmouseup = parent.onmouseleave = null;
			}
		}
	}
	function drawPolygon(parent) {
		// 在执行 drawPolygon 函数之前，先把上个绘制函数事件删除，否则上个绘制函数也会一直执行
		parent.onmousedown = parent.onmousemove = parent.onmouseup = null
		// 绘制栈，保存起始点和每条线的 DOM 节点，当多边形绘制完毕后，需要删除之前的circle和line节点
		parent.onclick = function (e) {
			if(e.target.tagName === 'circle') {
				var points = _self.polygonConfig.points.join(' ')
				var attrs = {
					'class': 'svg-child-not-g',
					'points': points,
					'fill': _self.color_active,
					'style': 'stroke:purple;stroke-width:1;opacity:.3'
				};
				var polygon = createPolygon(attrs)
				polygon.setAttribute('data-position', JSON.stringify(_self.polygonConfig.points))
				parent.appendChild(polygon)
				_self.polygonConfig.stack.forEach(function (item) {
					parent.removeChild(item)
				})
				polygon.setAttribute('data-index', parent.children.length - parent.getElementsByTagName('g').length)
				document.querySelector('.lbi-mask').style.display = 'block';
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
		}
	}
	function drawPolyline(parent) {
		// 在执行 drawPoint 函数之前，先把上个绘制函数事件删除，否则上个绘制函数也会一直执行
		parent.onclick = parent.onmouseup = null

		var linePoints = [];
		parent.onmousedown = function (e){
			// 禁止鼠标右键弹出菜单
			document.oncontextmenu = function () {
				return false;
			}
			// 点击鼠标左键
			if (e.buttons === 1) {
				_self.x = e.offsetX * _self.kx;
				_self.y = e.offsetY * _self.ky;
				linePoints.push([_self.x, _self.y])
				if (linePoints.length > 1) {
					var attrs = {
						'class': 'svg-child-not-g polyline-active',
						'points': linePoints.join(' '),
						'fill': 'none',
						'stroke': _self.color_active,
						'data-index': parent.children.length - parent.getElementsByTagName('g').length + 1,
						'data-position': linePoints
					};
					var polyline = document.querySelector('.polyline-active');
					if (polyline) {
						polyline.setAttribute('points', linePoints.join(' '))
						polyline.setAttribute('data-position', JSON.stringify(linePoints))
					} else {
						polyline = createPolyline(attrs)
					}
					parent.appendChild(polyline)
				}
				return ;
			}
			// 点击鼠标右键
			if (e.buttons === 2) {
				if (linePoints.length < 2) {
					var polyline = document.querySelector('.polyline-active');
					polyline.parentNode.removeChild(polyline)
					linePoints = []
					return ;
				}
				document.querySelector('.polyline-active').setAttribute('points', linePoints.join(' '))
				linePoints = []
				document.querySelector('.polyline-active').classList.remove('polyline-active')
				document.querySelector('.lbi-mask').style.display = 'block';
			}
		}
		parent.onmousemove = function (e) {
			_self.x = e.offsetX * _self.kx;
			_self.y = e.offsetY * _self.ky;
			var movePoint = [_self.x, _self.y];
			var movePoints = linePoints.concat(movePoint)
			if (linePoints.length > 0) {
				var attrs = {
					'class': 'svg-child-not-g polyline-active',
					'points': movePoints.join(' '),
					'fill': 'none',
					'stroke': _self.color_active,
					'data-index': parent.children.length - parent.getElementsByTagName('g').length + 1,
					'data-position': linePoints
				};
				var polyline = document.querySelector('.polyline-active');
				if (polyline) {
					polyline.setAttribute('points', movePoints.join(' '))
				} else {
					polyline = createPolyline(attrs)
				}
				parent.appendChild(polyline)
			}
		}
	}


	// =============================================================
	// 创建 svg 图形，暂时给每个图形创建都写一个函数，因为以后可能会对不同的元素添加不同的操作
	// @param  {Object} attrs     圆的 html 属性
	// @return {DOM Node}     DOM节点
	// =============================================================
	function createPoint(attrs) {
		var circle = makeElementNS('circle', attrs)
		circle.addEventListener('mouseover', function (e) {
			e.target.style.strokeWidth = 10
		})
		circle.addEventListener('mouseout', function (e) {
			e.target.style.strokeWidth = 1
		})
			
		return circle;
	}
	function createLine(attrs) {
		var line = makeElementNS('line', attrs);

		return line;
	}
	function createRect(attrs) {
		var rect = makeElementNS('rect', attrs);

		return rect;
	}
	function createPolygon(attrs) {
		var polygon = makeElementNS('polygon', attrs);

		return polygon;
	}
	function createPolyline(attrs) {
		var polyline = makeElementNS('polyline', attrs);

		return polyline;
	}

	// 创建标注对象属性
	function createLabelsItem(index) {
		var item = document.createElement('li');
		item.className = 'labels-item';
		var itemStr = `
			<span>${index}</span>
			<input type="text">
		`;
		item.innerHTML = itemStr;
		var labels = document.getElementsByClassName('paint-labels')[0]
		labels.appendChild(item)

		_self.labelsConfig.stack.push(item)
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
	/**
	 * 获取兄弟元素
	 */
	function getSiblings(nodes, target) {
		var siblings = Array.prototype.filter.call(nodes, function (item, index) {
			return item !== target
		});

		return siblings;
	}
	return Labelimg;
})()