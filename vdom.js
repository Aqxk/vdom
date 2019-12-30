
const vNodeType = {
    HTML: 'HTML',
    TEXT: "TEXT",
    COMPONENT: "COMPONENT",
    CLASS_COMPONENT: "CLASS_COMPONENT"
}
const childrenType = {
    EMPTY: "EMPTY",
    SINGLE: "SINGLE",
    MULTIPLE: "MULTIPLE"
}
// 新建虚拟dom
function createElement(tag, data, children = null) {
    let flag;
    if (typeof tag === 'string') {
        // 普通html标签
        flag = vNodeType.HTML
    } else if (typeof tag === 'function') {
        flag = vNodeType.OMPONENT
    } else {
        flag = vNodeType.TEXT
    }
    let childrenFlag;
    if (children == null) {
        childrenFlag = childrenType.EMPTY;
    } else if (Array.isArray(children)) {
        let length = children.length;
        if (length === 0) {
            childrenFlag = childrenType.EMPTY;
        } else {
            childrenFlag = childrenType.MULTIPLE;
        }
    } else {
        // 文本
        childrenFlag = childrenType.SINGLE;
        children = createTextVnode(children);
    }
    // 返回
    return {
        el: null,
        flag,  //Vnode类型
        tag, //标签 文本没有tag
        data,
        key: data && data.key,
        children,
        childrenFlag
    }
}
// 渲染dom
function render(vnode, container) {
    // 区分首次渲染和再次渲染
    if (container.vonde) {
        let preVnode = container.vonde;
        // 更新
        patch(preVnode, vnode, container)
    } else {
        mount(vnode, container)
    }
    container.vonde = vnode;
}
function patch(prev, next, container) {
    let nextFlag = next.flag;
    let prevFlag = prev.flag;
    if (nextFlag !== prevFlag) {
        replaceVnode(prev, next, container);
    } else if (nextFlag == vNodeType.HTML) {
        patchElement(prev, next, container);
    } else if (nextFlag == vNodeType.TEXT) {
        patchText(prev, next);
    }
}
function patchElement(prev, next, container) {
    if (prev.tag !== next.tag) {
        replaceVnode(prev, next, container);
        return;
    }
    let el = (next.el = prev.el);
    let prevData = prev.data;
    let nextData = next.data;
    if (nextData) {
        for (let key in nextData) {
            let prevVal = prevData[key];
            let nextVal = nextData[key];
            patchData(el, key, prevVal, nextVal)
        }
    }
    if (prevData) {
        for (let key in prevData) {
            let prevVal = prevData[key];
            // 删除旧的属性  新的属性中没有
            if (prevVal && !nextData.hasOwnProperty(key)) {
                patchData(el, key, prevVal, null)
            }
        }
    }
    // 属性更新完毕
    patchChildren(
        prev.childrenFlag,
        next.childrenFlag,
        prev.children,
        next.children,
        el
    )
}
// 更新子元素
function patchChildren(
    prevChildFlag,
    nextChildFlag,
    prevChildren,
    nextChildren,
    container
) {
    // 老的子元素 空,单独, 多个, 
    switch (prevChildFlag) {
        case childrenType.EMPTY:
            switch (nextChildFlag) {
                case childrenType.EMPTY:

                    break;
                case childrenType.SINGLE:
                    mount(nextChildren, container)
                    break;
                case childrenType.MULTIPLE:
                    for (let i = 0; i < nextChildren.length; i++) {
                        mount(nextChildren[i], container)
                    }
                    break;
            }
            break;
        case childrenType.SINGLE:
            switch (nextChildFlag) {
                case childrenType.EMPTY:
                    container.removeChild(prevChildren.el);
                    break;
                case childrenType.SINGLE:
                    patch(prevChildren, nextChildren, container);
                    break;
                case childrenType.MULTIPLE:
                    container.removeChild(prevChildren.el);
                    for (let i = 0; i < nextChildren.length; i++) {
                        mount(nextChildren[i], container)
                    }
                    break;
            }
            break;
        case childrenType.MULTIPLE:
            switch (nextChildFlag) {
                case childrenType.EMPTY:
                    //删除
                    for (let i = 0; i < prevChildren; i++) {
                        container.removeChild(prevChildren[i].el);
                    }
                    mount(nextChildren, container);
                    break;
                case childrenType.SINGLE:
                    for (let i = 0; i < prevChildren; i++) {
                        container.removeChild(prevChildren[i].el);
                    }
                    mount(nextChildren, container);
                    break;
                case childrenType.MULTIPLE:
                    // 更新多个子元素
                    let lastIndex = 0;
                    for (let i = 0; i < nextChildren.length; i++) {
                        let nextVnode = nextChildren[i];
                        let find = false;
                        let j = 0;
                        for (j; j < prevChildren.length; j++) {
                            let preVnode = prevChildren[j];
                            if (preVnode.key === nextVnode.key) {
                                // key相同,认为同一个元素
                                find = true;
                                patch(preVnode, nextVnode, container);
                                if (j < lastIndex) {
                                    //   移动元素 insertBefore
                                    let flagNode = nextChildren[i - 1].el.nextSibling;
                                    container.insertBefore(preVnode.el, flagNode);
                                    break;
                                } else {
                                    lastIndex = j;
                                }
                            }
                        }
                        if (!find) {
                            // 需要新增的元素;
                            let flagNode = i == 0 ? prevChildren[0].el : nextChildren[i - 1].el.nextSibling;
                            mount(nextVnode, container, flagNode);
                        }
                    }
                    // 移除不需要元素
                    for (let i = 0; i < prevChildren.length; i++) {
                        const preVnode = prevChildren[i];
                        const has = nextChildren.find(next => next.key === preVnode.key);
                        if (!has) {
                            // 没找多旧的元素
                            container.removeChild(preVnode.el);
                        };
                    }
                    break;
            }
            break;
    }
}
/**
 * patchText 更新文本函数
 * @param {*} prev 
 * @param {*} next 
 */
function patchText(prev, next) {
    let el = (next.el = prev.el);
    if (next.children !== prev.children) {
        el.nodeValue = next.children;
    }
}
function replaceVnode(prev, next, container) {
    // 删除旧的
    container.remove(prev.el);
    // 更新新的节点
    mount(next, container);
}
function mount(vnode, container, flagNode) {
    let { flag } = vnode;
    if (flag === vNodeType.HTML) {
        mountElement(vnode, container, flagNode)
    } else if (flag == vNodeType.TEXT) {
        mountText(vnode, container);
    }
}
function mountElement(vnode, container, flagNode) {
    let dom = document.createElement(vnode.tag);
    vnode.el = dom;
    // data 属性
    let { data, children, childrenFlag } = vnode;
    //挂在属性
    if (data) {
        for (let key in data) {
            // 节点名称 名字 老值 新值
            patchData(dom, key, null, data[key]);
        }
    }
    if (childrenFlag !== childrenType.EMPTY) {
        if (childrenFlag === childrenType.SINGLE) {
            mount(children, dom)
        } else if (childrenFlag === childrenType.MULTIPLE) {
            for (let i = 0; i < children.length; i++) {
                mount(children[i], dom);
            }
        }
    }
    flagNode ? container.insertBefore(dom, flagNode) : container.appendChild(dom);

}
function mountText(vnode, container) {
    let dom = document.createTextNode(vnode.children);
    vnode.el = dom;
    container.appendChild(dom);
}
function patchData(el, key, prev, next) {
    switch (key) {
        case 'style':
            for (let k in next) {
                el.style[k] = next[k];
            }
            for (let k in prev) {
                if (!next.hasOwnProperty(k)) {
                    el.style[k] = '';
                }
            }
            break;
        case 'class':
            el.className = next;
            break;
        default:
            if (key[0] === '@') {
                if (prev) {
                    el.removeEventListener(key.slice(1), prev);
                }
                if (next) {
                    el.addEventListener(key.slice(1), next);
                }
            } else {
                el && el.setAttribute(key, next);
            }
            break;
    }
}
// 新建文本类型的 vnode
function createTextVnode(text) {
    return {
        el: null,
        flag: vNodeType.TEXT,
        tag: null,
        data: null,
        children: text,
        childrenFlag: childrenType.EMPTY
    }
}