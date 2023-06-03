// const element = {
// type: "h1",
// props: {
//     title: "foo title",
//     children: "Hello from childer"
// }
// }

// const container = document.getElementById("root");
// const node = document.createElement(element.type);

// node["title"] = node.props.tile;

// const text = document.createTextNode("");
// text["nodeValues"] = text.props.children;

// node.appendChild(text);
// container.appendChild(node);


// const element = (
//     <div id="foo">
//         <a>Hello from component</a>
//         <br />
//     </div>
// )
// const node = document.getElementById("root");
// ReactDOM.render(element, container);

// ctrl + / 


//*************** DIDACT FRAMEWORK ****************



//New way to make a loop for smoother rendering

function createElement(type, props, ...children) {
    return {
        type,
        props: {
            ...props,
            children: children.map(child =>
                typeof child === "object"
                    ? child
                    : createTextElement(child))
        }
    }
}

function createTextElement(text) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: text,
            children: []
        }
    }
}

//one fiber stands for one unit of work
function createDom(fiber) {
    const dom =
        fiber.type === "TEXT_ELEMENT"
            ? document.createTextNode("")
            : document.createElement(fiber.type)

    updateDom(dom, {}, fiber.props)

    return dom;
}

//UPDATE DOM
const isEvent = key => key.startsWith("on");
const isProperty = key =>
    key !== "children" && !isEvent(key);
const isNew = (prev, next) =>
    key => prev[key] !== next[key];
const isGone = (prev, next) => key => !(key in next);

function updateDom(dom, prevProps, nextProps) {
    // remove old or changed event listeners
    Object.keys(prevProps)
        .filter(isEvent)
        .filter(
            key =>
                !(key in nextProps) ||
                isNew(prevProps, nextProps)(key)
        ).forEach(name => {
            const eventType = name
                .toLowerCase()
                .substring(2)

            dom.removeEventListener(
                eventType,
                prevProps[name]
            )
        })

    //remove old properties 
    Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => {
            dom[name] = ""
        })

    //Set new or changed properties
    Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            dom[name] = nextProps[name]
        })

    //Add new event listeners
    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            const eventType = name
                .toLowerCase()
                .substring(2)

            dom.addEventListener(
                eventType,
                nextProps[name]
            )
        })
}

let nextUnitOfWork = null;
let whipRoot = null;
let currentRoot = null;
let deletions = null;

function commitRoot() {
    //todo add nodes to node
    deletions.forEach(commitWork);
    commitWork(whipRoot.child);
    currentRoot = whipRoot;
    whipRoot = null;
}

function commitWork(fiber) {
    if (!fiber) {
        return;
    }

    let domParentFiber = fiber.parent
    while (!domParentFiber.dom) {
        domParentFiber = domParentFiber.parent
    }

    const domParent = domParentFiber.dom;

    if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {

        domParent.appendChild(fiber.dom);
    } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
        updateDom(
            fiber.dom,
            fiber.alternate.props,
            fiber.props
        )
    }
    else if (fiber.effectTag === "DELETIONS") {
        domParent.removeChild(fiber.dom);
    }
    commitWork(fiber.child);
    commitWork(fiber.sibling);
}



function render(element, container) {
    // const dom = element.type == "TEXT_ELEMENT" ?
    //     document.createTextNode("")
    //     : document.createElement(element.type);

    // const isProperty = key => key !== "children";
    // Object.keys(element.props)
    //     .filter(isProperty)
    //     .forEach(name => { dom[name] = element.props[name] });

    // element.props.children.forEach(child =>
    //     render(child, dom)
    // );

    // container.appendChild(dom);

    whipRoot = {
        dom: container,
        props: {
            children: [element]
        },
        alternate: currentRoot,
    }
    deletions = [];
    nextUnitOfWork = whipRoot;

}


function workLoop(deadline) {
    let shoudlYield = false;
    while (nextUnitOfWork && !shoudlYield) {
        nextUnitOfWork = performUnitOfWork(
            nextUnitOfWork
        )
        shoudlYield = deadline.timeRemaining() < 1;
    }

    if (!nextUnitOfWork && whipRoot) {
        commitRoot();
    }
}
// is for make a loop
requestIdleCallback(workLoop);

function performUnitOfWork(fiber) {
    //todo add dom node
    if (!fiber.dom) {
        fiber.dom = createDom(fiber)
    }
    //todo create new fibres
    const elements = fiber.props.children;
    reconcileChildren(fiber, elements);

    if (fiber.child) {
        return fiber.child;
    }

    //todo return next unit of work
    let nextFiber = fiber;
    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling;
        }
        nextFiber = nextFiber.parent;
    }

}

function reconcileChildren(whipRoot, elements) {
    let index = 0;
    let prevSibling = null;
    let oldFiber = whipRoot.alternate && whipRoot.alternate.child;

    while (index < elements.length || oldFiber != null) {
        const element = elements[index];
        let newFiber = null;

        const sameType =
            oldFiber &&
            element &&
            element.type === oldFiber.type;

        // newFiber = {
        //     type: element.type,
        //     props: element.props,
        //     parent: whipRoot,
        //     dom: null
        // }

        if (sameType) {
            //todo update the node
            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: oldFiber.dom,
                parent: whipRoot,
                alternate: oldFiber,
                effectTag: "UPDATE"
            }
        }
        if (element && !sameType) {
            //todo add this node
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: whipRoot,
                alternate: null,
                effectTag: "PLACEMENT"
            }
        }
        if (oldFiber && !sameType) {
            //todo delete the oldFiber's node
            oldFiber.effectTag = "DELETION";
            deletions.push(oldFiber);
        }

        if (oldFiber) {
            oldFiber = oldFiber.sibling
        }

        if (index === 0) {
            whipRoot.child = newFiber
        } else {
            prevSibling.sibling = newFiber
        }

        prevSibling = newFiber;
        index++;


    }
}


// Didact library
const Didact = {
    createElement,
    render
}


// /** @jsx Didact.createElement */
// const element = (
//     <div>
//         <h1>Hello World</h1>
//         <h2>from Didact</h2>
//     </div>
// );


/** @jsx Didact.createElement */
const container = document.getElementById("root");

const updateValue = e => {
    rerender(e.target.value)
}

const rerender = value => {
    const element = (
        <div>
            <input onInput={updateValue} value={value} />
            <h2>Hello {value}</h2>
        </div>
    );
    Didact.render(element, container)
}

rerender("World");


//Didact.render(element, container);