
cc.Class({
  extends: cc.Component,
  properties: {
    cellSize: cc.Size,
    spacingX: 0,
    spacingY: 0,
    paddingTop: 0,
    paddingBottom: 0,
    fixedHeight: 0,
  },
  onLoad() {
    this.node.on('computeLayout', this.computeLayout, this);
  },
  calHeight() {
    const width = this.node.width;
    const nPerRow = Math.floor(width / this.cellSize.width);
    let idx = 0;
    this.node.children.forEach((node) => {
      if (!node.active) {
        return;
      }
      idx += 1;
    });
    const hIdx = Math.floor((idx - 1) / nPerRow);
    // mbgGame.log("calHeight", idx, hIdx);
    let y = -((hIdx + 0.5) * this.cellSize.height);
    y -= this.spacingY * hIdx;
    return Math.abs(y) + (0.5 * this.cellSize.height) + this.paddingBottom + this.paddingTop + this.fixedHeight;
  },
  // 非active的子节点是否参与layout
  setIgnoreActive(b) {
    this.m_IgnoreActive = b;
  },
  computeLayout() {
    const width = this.node.width;
    const nPerRow = Math.floor(width / this.cellSize.width);
    mbgGame.log("computeLayout, nPerRow", nPerRow);
    this.node.children.forEach((node) => {
      if (!this.m_IgnoreActive && !node.active) {
        return;
      }
      let idx = node.getSiblingIndex();
      const hIdx = Math.floor(idx / nPerRow);
      idx = Math.floor(idx % nPerRow);
      node.x = ((idx + 0.5) * this.cellSize.width) - (width * 0.5);
      node.y = -((hIdx + 0.5) * this.cellSize.height);
      if (idx !== 0) {
        node.x += this.spacingX * idx;
      }
      if (hIdx !== 0) {
        node.y -= this.spacingY * hIdx;
      }
      node.y -= this.paddingTop;
    });
    this.node.height = this.calHeight();// this.cellSize.height * (this.node.children.length / nPerRow);
  },

  scrollToNode(node) {
    const maskNode = this.node.parent;
    const contentNode = this.node;
    const contentHeight = maskNode.height;
    const sv = maskNode.parent.getComponent(cc.ScrollView);

    const nodeHeight = node.height / 2 + this.fixedHeight;
    const nodeY = Math.abs(node.getPosition().y);
    const contentNodeY = Math.abs(contentNode.getPosition().y);
    // mbgGame.log(`[scrollToNode] wNodePos:${contentNode.getPosition()} nodeY:${nodeY} contentNodeY:${contentNodeY}`);

    if (nodeY - contentNodeY < 60) {
      // 已经在mask顶，需要滚上去
      sv.scrollToOffset(new cc.Vec2(0, nodeY - 60), 0.2);
    } else if (nodeY + nodeHeight - contentNodeY > contentHeight) {
      sv.scrollToOffset(new cc.Vec2(0, nodeY + nodeHeight - contentHeight), 0.2);
    }
  },
});