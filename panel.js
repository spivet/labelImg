var Svgpanel = (function () {
	var _self; // 该插件内的全局变量，用来获取 this

	function Svgpanel(opt) {
		this.boardWrap = opt.el;
		this.shape = opt.shape || 'polygon';

		this.x = 0;
		this.y = 0;
		this.kx = 1;
		this.ky = 1;
		this.imgWidth = 0;
		this.imgHeight = 0;
		this.points = [];

		// this.count = 0;
		this.drawingStack = [];
		this.outputData = [];
		_self = this;

		this.TOOL = [
			// { NAME: 'point', ICON: '\u25CF', TITLE: '点', isShape: true },
			// { NAME: 'line', ICON: '\u2572', TITLE: '线', isShape: true },
			// { NAME: 'circle', ICON: '\u25EF', TITLE: '圆', isShape: true },
			// { NAME: 'rect', ICON: '\u25AD', TITLE: '矩形', isShape: true },
			// { NAME: 'polygon', ICON: '\u2606', TITLE: '多边形', isShape: true },
			{ NAME: 'magnify', ICON: '\u29FE', TITLE: '放大' },
			{ NAME: 'shrink', ICON: '\u29FF', TITLE: '缩小' },
			{ NAME: 'repeal', ICON: '\u23F4', TITLE: '撤销' },
			{ NAME: 'clean', ICON: '\u27F3', TITLE: '清空' }
		]
		renderUI(this.boardWrap, this.TOOL)
		draw.call(this)
	}

	Svgpanel.prototype = {
		addImg: function (src) {
			var img = document.createElement('img');
			img.id = 'board-img';
			img.src = src;
			var _svg = document.getElementById('board-svg');
			_svg.parentNode.appendChild(img);
			img.onload = function () {
				_svg.style.width = img.clientWidth + 'px';
				_svg.style.height = img.clientHeight + 'px';
				_svg.setAttribute('viewBox', `0, 0, ${img.clientWidth}, ${img.clientHeight}`)
				// 保存图片原始尺寸，当图片放大或缩小后，需要与原始尺寸对比，计算比例系数
				_self.imgWidth = img.clientWidth;
				_self.imgHeight = img.clientHeight;
			}
		},
		output: function () {
			return this.outputData;
		}
	}

	function renderUI(target, tools) {
		renderToolbar(target, tools)
		renderboard(target)
	}
	function renderToolbar(target, tools) {
		var toolbar = document.createElement('div');
		toolbar.className = 'paint-toolbar';

		var toolbarHtml = '';
		tools.forEach(function (tool) {
			if (tool.isShape) {
				toolbarHtml += `
					<span class="toolbar-item toolbar-item-shape" title="${tool.TITLE}" data-name="${tool.NAME}">
						${tool.ICON}
					</span>
				`
			} else {
				toolbarHtml += `
					<span class="toolbar-item" title="${tool.TITLE}" data-name="${tool.NAME}">
						${tool.ICON}
					</span>
				`
			}
		})
		toolbar.innerHTML = toolbarHtml;
		target.appendChild(toolbar)

		toolEvent()
	}
	function renderboard(target) {
		var board = document.createElement('div');
		board.className = 'paint-board';
		target.appendChild(board)
		// TODO 添加svg优化，是否要用 appendChild()
		var svg = '<svg id="board-svg"></svg>';
		board.innerHTML = svg;
		var _svg = document.getElementById('board-svg')
		_svg.style.width = board.clientWidth + 'px';
		_svg.style.height = board.clientHeight + 'px';
	}
	// toobar 里每个按钮被点击后所执行的操作
	// 在 renderToolbar() 函数的末尾调用，当 toobar 渲染完毕后执行
	function toolEvent() {
		var _toolItems = document.getElementsByClassName('toolbar-item');
		var _toolbar = document.getElementsByClassName('paint-toolbar')[0];
		_toolbar.addEventListener('click', function (e) {
			var target = e.target;
			// 由于渲染顺序的原因，暂时需要在点击 toolbar 里的按钮时获取 svg 和 img
			var _svg = document.getElementById('board-svg'),
				_img = document.getElementById('board-img');
			if(target.tagName.toLowerCase() === 'span') {
				switch (target.dataset.name) {
					case 'magnify':
						magnifyImg(_img, _svg)
						break;
					case 'shrink':
						shrinkImg(_img, _svg)
						break;
					case 'repeal':
						repeal(_svg)
						break;
					case 'clean':
						clean(_svg)
						break;
					default:
						// statements_def
						break;
				}
			}
		})
	}
	function magnifyImg(img, svg) {
		_img.style.width = _img.clientWidth + 100 + 'px';
		_svg.style.width = _img.clientWidth + 'px';
		_svg.style.height = _img.clientHeight + 'px';

		// svg 跟随图片一起缩放时，需要计算出 svg 缩放前后的宽高比例系数
		// 并且以后的坐标都会乘以这个系数，否则绘制的坐标是错误的
		_self.kx = _self.imgWidth / _img.clientWidth
		_self.ky = _self.imgHeight / _img.clientHeight

	}
	function shrinkImg(img, svg) {
		_img.style.width = _img.clientWidth - 100 + 'px';
		_svg.style.width = _img.clientWidth + 'px';
		_svg.style.height = _img.clientHeight + 'px';
		_self.kx = _self.imgWidth / _img.clientWidth
		_self.ky = _self.imgHeight / _img.clientHeight

	}
	function repeal(parent) {
		if (parent.lastChild) {
			parent.removeChild(parent.lastChild)
		}
		if (_self.drawingStack.length > 0) {
			// parent.removeChild(_self.drawingStack[_self.drawingStack.length - 1])
			parent.removeChild(parent.lastChild)
			_self.points.pop()
			// _self.drawingStack.pop()
		}
	}
	function clean(parent) {
		parent.innerHTML = ''
		_self.points = []
		_self.drawingStack = [];
	}
	// 绘制图形的方法
	function draw() {
		var that = this;
		var _svg = document.getElementById('board-svg');

		switch (_self.shape) {
			case 'point':
				drawpoint(_svg)
				break;
			case 'rect':
				drawrect(_svg)
				break;
			case 'polygon':
				drawpolygon(_svg)
				break;
			default:
				// statements_def
				break;
		}
		
	}
	function drawpoint(parent, attrs) {
		parent.addEventListener('mousedown', function (e){
			_self.x = e.offsetX * _self.kx;
			_self.y = e.offsetY * _self.ky;
			var point = createPoint(_self.count++, _self.x, _self.y, 1)
			point.className = 'point'
			parent.appendChild(point)
		},false)
		parent.addEventListener('mouseover', function (e){
			if (e.target.className === 'point') {
			}
		},false)

	}
	function drawrect(parent, attrs) {
		var x, y;
		parent.onmousedown = function (e) {
			_self.x = e.offsetX * _self.kx;
			_self.y = e.offsetY * _self.ky;
			var rect = createRect(_self.x, _self.y, 0, 0)
			parent.appendChild(rect)
			parent.onmousemove = function (e) {
				e.offsetX * _self.kx > _self.x ? x = _self.x : x = e.offsetX * _self.kx
				e.offsetY * _self.ky > _self.y ? y = _self.y : y = e.offsetY * _self.ky
				rect.setAttribute('x', x)
				rect.setAttribute('y', y)
				rect.setAttribute('width', Math.abs(e.offsetX * _self.kx - _self.x))
				rect.setAttribute('height', Math.abs(e.offsetY * _self.ky - _self.y))
			}
			parent.onmouseup = function () {
				parent.onmousemove = null
			}

		}
	}
	function drawpolygon(parent) {
		// 绘制栈，保存起始点和每条线的 DOM 节点，当多边形绘制完毕后，需要删除之前的circle和line节点
		parent.addEventListener('click', function (e) {
			if(e.target.tagName === 'circle') {
				var points = _self.points.join(' ')
				var polygon = createPolygon(points)
				parent.appendChild(polygon)
				_self.drawingStack.forEach(function (item) {
					parent.removeChild(item)
				})
				_self.drawingStack = []
				_self.points = []
			} else {
				// 传给图形的坐标参数，需要乘以 svg 缩放前后的宽高比例系数
				_self.x = e.offsetX * _self.kx;
				_self.y = e.offsetY * _self.ky;
				_self.points.push([_self.x, _self.y])
				var pointsLen = _self.points.length;
				if (pointsLen === 1) {
					var circle = createPoint(_self.count++, _self.x, _self.y, 4)
					this.appendChild(circle)
					_self.drawingStack.push(circle)
					return;
				}
				if(pointsLen > 1) {
					var x1 = _self.points[pointsLen - 2][0],
					 	y1 = _self.points[pointsLen - 2][1],
						x2 = _self.points[pointsLen - 1][0],
						y2 = _self.points[pointsLen - 1][1];

					var line = createLine(_self.count++, x1, y1, x2, y2)
					this.appendChild(line)
					_self.drawingStack.push(line)
				}				
			}
		})
	}

	// 创建 svg 图形
	/**
	 * 创建 圆形
	 * @param  {[type]} count [description]
	 * @param  {[type]} x     原点的 x 值
	 * @param  {number} y     原点的 y 值
	 * @param  {Number} r     圆的半径
	 * @return {DOM Node}     DOM节点
	 */
	function createPoint(count, x, y, r) {
		var	opt = {
			// id: 'circle' + count,
			cx: x,
			cy: y,
			r: r,
			stroke: 'black',
			fill: 'red'
		};
		var circle = makeElementNS('circle', opt)
		circle.addEventListener('mouseover', function (e) {
			e.target.setAttribute('r', 10)
		})
		circle.addEventListener('mouseout', function (e) {
			e.target.setAttribute('r', r)
		})
			
		return circle;
	}
	function createLine(count, x1, y1, x2, y2) {
		var	opt = {
			// id: 'line' + count,
			x1: x1,
			y1: y1,
			x2: x2,
			y2: y2,
			style: 'stroke:rgb(255,0,0);stroke-width:1'
		};
		var line = makeElementNS('line', opt)

		return line;
	}
	function createRect(x, y, width, height) {
		var opt = {
			x: x,
			y: y,
			width: width,
			height: height,
			style: 'fill:none;stroke:purple;stroke-width:1'
		};
		var rect = makeElementNS('rect', opt)

		return rect;
	}
	function createPolygon(points) {
		var opt = {
			points: points,
			style: 'fill:#f33;stroke:purple;stroke-width:1;opacity:.3'
		};
		var polygon = makeElementNS('polygon', opt)

		return polygon;
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
	return Svgpanel;
})()