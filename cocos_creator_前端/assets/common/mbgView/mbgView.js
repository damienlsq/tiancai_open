
const Direction = cc.Enum({
  TABLEVIEW_FILL_TOPDOWN: 0,
  TABLEVIEW_FILL_BOTTOMUP: 1,
});

cc.Class({
  extends: cc.ScrollView,
  properties: {
    cellWidth: 0,
    cellHeight: 0,
    topSpace: 0,
    _vOrdering: null,
    _cellsPositions: null,                       // vector with all cell positions

    Direction: {
      default: 1,
      type: Direction,
      tooltip: '规定cell的排列方向',
      /*
      notify() {
        if (!CC_EDITOR) return;
        if (!this.content) return;
        // 如果设置为 TABLEVIEW_FILL_TOPDOWN, content必须设为anchor 0, 1
        if (this.Direction === Direction.TABLEVIEW_FILL_TOPDOWN) {
          this.content.setAnchorPoint(0, 1);
        } else if (this.Direction === Direction.TABLEVIEW_FILL_BOTTOMUP) {
          this.content.setAnchorPoint(0, 0);
        }
      },
      */
    },
  },

  onLoad() {
    this.node.on('scrolling', this.scrollEvent, this);
  },
  onDestroy() {
    mbgGame.log('mbgView onDestroy');
    emitter.off(this);
  },

  initTableView(dataSource) {
    // mbgGame.log('initTableView', this._isInited);
    if (this._isInited) {
      this.updateItems(dataSource.items);
      return;
    }
    // mbgGame.log('initTableView');
    this._cellsPositions = [];
    this.cellObjectList = {};
    this.cellCache = {};

    this._vOrdering = this.Direction;
    this._viewSize = cc.size(this.content.width, this.content.height);

    this.setDataSource(dataSource);
    this._updateCellPositions();
    this._updateContentSize();

    this.reloadData();
    this._isInited = true;
  },


  // 刷新tableview数据，并reload
  updateItems(items) {
    this._dataSource.items = items || [];
    this.reloadData();
  },

  reloadData() {
    this._updateCellPositions();
    this._updateContentSize();

    this.content.children.forEach((x) => {
      if (x && x.isValid) {
        x.destroy();
      }
    });
    this.cellObjectList = {};
    if (this._dataSource.items.length > 0) {
      this.checkInSigh();
    }
  },

  _updateCellPositions() {
    this._cellsPositions = [];
    if (this._dataSource.items.length < 1) return;

    let currentPos = this.topSpace;
    let cellSize;
    for (let i = 0; i < this._dataSource.items.length; i++) {
      this._cellsPositions.push(currentPos);
      cellSize = this._dataSource.tableCellSizeForIndex(this, i);
      if (this.horizontal) {
        currentPos += cellSize.width;
      } else {
        currentPos += cellSize.height;
      }
    }
    this._cellsPositions.push(currentPos);
  },

  _updateContentSize() {
    let size = cc.size(0, 0);
    const cellsCount = this._dataSource.items.length;
    if (cellsCount > 0) {
      const maxPosition = this._cellsPositions[cellsCount];
      if (this.horizontal) {
        size = cc.size(maxPosition, this._viewSize.height);
      } else {
        size = cc.size(this._viewSize.width, maxPosition);
      }
    }
    if (!this._defaultConentHeight) {
      this._defaultConentHeight = this.content.height;
    }
    this.content.width = size.width;
    this.content.height = size.height + this.topSpace;
    if (!this._saveContentPosition) {
      this._saveContentPosition = this.getContentPosition();
    }
    // const nowPosition = this.getContentPosition();
    if (this.Direction === Direction.TABLEVIEW_FILL_BOTTOMUP) {
      if (this.content.height < this._defaultConentHeight) {
        this.scrollToBottom();
        this._saveContentPosition = this.getContentPosition();
      }
    }
    // mbgGame.log('_updateContentSize', this.content.height, this._defaultConentHeight, this._saveContentPosition, nowPosition);
  },

  /**
   * data source
   */
  getDataItem(idx) {
    return this._dataSource.items[idx];
  },
  setCellPosition(cell, idx) {
    let y = this._cellsPositions[idx];
    let anchorY = 0;
    if (this._vOrdering === Direction.TABLEVIEW_FILL_TOPDOWN) {
      // 往下增长
      y *= -1;
      anchorY = 1;
    }
    cell.anchorY = anchorY;
    cell.setAnchorPoint(0, anchorY);
    cell.setPosition(0, y);
  },
  setDataSource(source) {
    this._dataSource = {
      items: [],
      tableCellSizeForIndex(table, idx) {
        if (this.cellObjectSize) {
          const size = this.cellObjectSize(table, idx);
          // mbgGame.log('[tableCellSizeForIndex] cellObjectSize', size, idx);
          return size;
        }
        return cc.size(table.cellWidth, table.cellHeight);
      },
      tableCellAtIndex(table, idx) {
        const cell = new cc.Node();
        cell._idx = idx;

        // mbgGame.log('[tableCellAtIndex new]', idx, table.getDataItem(idx));
        let node;
        if (this.newCellObject) {
          node = this.newCellObject(table, idx, cell);
        }
        /*
                // debug use
                const sprite = cell.addComponent(cc.Sprite);
                sprite.type = cc.Sprite.Type.SLICED;
                sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
                mbgGame.resManager.setAutoAtlasFrame(sprite, 'uiIcon', 'frameBlack');
        */
        cell.width = node.width;
        cell.height = node.height;
        node.x = node.width * node.anchorX;
        table.setCellPosition(cell, idx);
        cell.addChild(node);
        return cell;
      },
    };
    if (source.items) this._dataSource.items = source.items;
    if (source.newCellObject) this._dataSource.newCellObject = source.newCellObject;
    if (source.cellObjectSize) this._dataSource.cellObjectSize = source.cellObjectSize;
    if (source.removeCell) this._dataSource.removeCell = source.removeCell;
  },

  hasItem(item) {
    return this._dataSource.items.indexOf(item) !== -1;
  },

  // scrolling 事件触发
  scrollEvent() {
    if (!this._isInited) return;
    this.checkInSigh();
  },

  removeCell(idx) {
    // mbgGame.log('remove idx', idx, this._dataSource.items[idx]);
    const cell = this.cellObjectList[idx];
    delete this.cellObjectList[idx];
    if (this._dataSource.removeCell) {
      // 如果有cache需求，使用这个函数自己处理
      this._dataSource.removeCell(this, cell);
    }
    if (cell && cell.isValid) {
      cell.destroy();
    }
  },

  addCell(idx) {
    if (idx >= this._dataSource.items.length) return;
    if (this.cellObjectList[idx]) return;
    // mbgGame.log('addCell idx', idx, this._dataSource.items[idx]);

    const cell = this._dataSource.tableCellAtIndex(this, idx);
    this.content.addChild(cell);
    this.cellObjectList[idx] = cell;
    // mbgGame.log('add idx', idx);
  },

  checkInSigh() {
    let minPos = 0;
    let maxPos = this._viewSize.height;

    const offset = this.getContentPosition();
    if (this._vOrdering === Direction.TABLEVIEW_FILL_TOPDOWN) {
      minPos = offset.y - this._saveContentPosition.y;
      maxPos = this._viewSize.height + offset.y - this._saveContentPosition.y;
    } else {
      minPos = this._saveContentPosition.y - offset.y;
      maxPos = this._viewSize.height + this._saveContentPosition.y - offset.y;
    }
    // const offset_content = this.getContentPosition();
    // mbgGame.log('scrollViewDidScroll', offset, this.content.getPosition());
    let startIdx = -1;
    let endIdx = -1;
    for (let i = 0; i < this._cellsPositions.length; i++) {
      const pos = this._cellsPositions[i];
      if (pos >= minPos && startIdx === -1) startIdx = i;
      if (pos >= maxPos && endIdx === -1) endIdx = i;
      if (startIdx !== -1 && endIdx !== -1) break;
    }
    if (endIdx === -1) endIdx = this._cellsPositions.length - 1;
    startIdx -= 1;
    endIdx += 1;
    if (startIdx < 0) startIdx = 0;
    if (endIdx > this._cellsPositions.length - 1) endIdx = this._cellsPositions.length - 1;

    for (let i = 0; i < this._cellsPositions.length; i++) {
      if (i >= startIdx && i <= endIdx) {
        this.addCell(i);
      } else {
        this.removeCell(i);
      }
    }
    // mbgGame.log('checkInSigh', startIdx, endIdx, this._saveContentPosition, offset, minPos, maxPos, this.content.height);
  },
});
