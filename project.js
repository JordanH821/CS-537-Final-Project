'use strict';

var canvas;
var gl;
var aspect = 1;
var modelViewMatrix = lookAt(
    vec3(0.0, 0.0, -1) /* eye */,
    vec3(0, 0, 0) /* looking at */,
    vec3(0, 1, 0) /* up */
);
var projectionMatrix = perspective(135.0, aspect, 0.2, 10);

let currentObject = 0;
let objects = {};
let defaults = {};

function getCombinedRotation(x, y, z) {
    return mult(rotate(...x), mult(rotate(...y), rotate(...z)));
}

const translationGetter = {
    get: function () {
        return translate(...this.translationVector);
    },
};

const rotationGetter = {
    get: function () {
        return getCombinedRotation(this.rotateX, this.rotateY, this.rotateZ);
    },
};

function deepCopy(src) {
    let copy = {};
    for (const [key, val] of Object.entries(src)) {
        if (
            ['translationVector', 'rotateX', 'rotateY', 'rotateZ'].includes(key)
        ) {
            copy[key] = [...val];
        }
    }
    copy['isRendering'] = true;
    return copy;
}

let kitty = {
    objPath: './objs/kitty/kitty.obj',
    textureHtmlId: 'kittyTexture',
    vertexShader: 'kitty-vertex-shader',
    fragmentShader: 'kitty-fragment-shader',
    scale: scalem(0.01, 0.01, 0.01),
    translationVector: vec3(0.25, 0.25, 0),
    rotateX: vec4(0, 1, 0, 0),
    rotateY: vec4(180, 0, 1, 0),
    rotateZ: vec4(0, 0, 0, 1),
    isRendering: true,
};
objects['kitty'] = kitty;

let puppy = {
    objPath: './objs/puppy/Puppy.obj',
    textureHtmlId: 'puppyTexture',
    vertexShader: 'puppy-vertex-shader',
    fragmentShader: 'puppy-fragment-shader',
    scale: scalem(0.01, 0.01, 0.01),
    translationVector: vec3(-0.25, 0.25, 0),
    rotateX: vec4(0, 1, 0, 0),
    rotateY: vec4(180, 0, 1, 0),
    rotateZ: vec4(0, 0, 0, 1),
    isRendering: true,
};
objects['puppy'] = puppy;

let pumpkin = {
    objPath: './objs/pumpkin/pumpkin.obj',
    textureHtmlId: 'pumpkinTexture',
    vertexShader: 'pumpkin-vertex-shader',
    fragmentShader: 'pumpkin-fragment-shader',
    scale: scalem(0.003, 0.003, 0.003),
    translationVector: vec3(0.0, 0.25, 0),
    rotateX: vec4(0, 1, 0, 0),
    rotateY: vec4(180, 0, 1, 0),
    rotateZ: vec4(0, 0, 0, 1),
    isRendering: true,
};
objects['pumpkin'] = pumpkin;

let rock = {
    objPath: './objs/rock/rock.obj',
    textureHtmlId: 'rockTexture',
    vertexShader: 'pumpkin-vertex-shader',
    fragmentShader: 'pumpkin-fragment-shader',
    scale: scalem(0.02, 0.02, 0.02),
    translationVector: vec3(-0.25, -0.5, 0),
    rotateX: vec4(0, 1, 0, 0),
    rotateY: vec4(180, 0, 1, 0),
    rotateZ: vec4(0, 0, 0, 1),
    isRendering: true,
};
objects['rock'] = rock;

let pizza = {
    objPath: './objs/pizza/pizza.obj',
    textureHtmlId: 'pizzaTexture',
    vertexShader: 'pizza-vertex-shader',
    fragmentShader: 'pizza-fragment-shader',
    scale: scalem(1, 1, 1),
    translationVector: vec3(-0.75, 0.25, 0),
    rotateX: vec4(90, 1, 0, 0),
    rotateY: vec4(0, 0, 1, 0),
    rotateZ: vec4(180, 0, 0, 1),
    isRendering: true,
};
objects['pizza'] = pizza;

let wooden_crate = {
    objPath: './objs/box/wooden crate.obj',
    textureHtmlId: 'woodenCrateTexture',
    vertexShader: 'wooden_crate-vertex-shader',
    fragmentShader: 'wooden_crate-fragment-shader',
    scale: scalem(0.25, 0.25, 0.25),
    translationVector: vec3(0.65, -0.25, 0),
    rotateX: vec4(0, 1, 0, 0),
    rotateY: vec4(180, 0, 1, 0),
    rotateZ: vec4(0, 0, 0, 1),
    isRendering: true,
};
objects['wooden_crate'] = wooden_crate;

for (const [name, obj] of Object.entries(objects)) {
    Object.defineProperty(obj, 'translation', translationGetter);
    Object.defineProperty(obj, 'rotation', rotationGetter);
    defaults[name] = deepCopy(obj);
}

function getOrderedNormalsFromObj(o) {
    var normalsOrderedWithVertices = new Array(o.c_verts.length);
    let VI = o.i_verts,
        NI = o.i_norms,
        NC = o.c_norms;
    for (let i = 0; i < VI.length; i++) {
        let x = VI[i] * 3;
        let y = NI[i] * 3;
        normalsOrderedWithVertices[x] = NC[y];
        normalsOrderedWithVertices[x + 1] = NC[y + 1];
        normalsOrderedWithVertices[x + 2] = NC[y + 2];
    }
    return normalsOrderedWithVertices;
}

function getOrderedTextureCoordsFromObj(o) {
    let l = o.i_verts.length;
    let VI = o.i_verts,
        TI = o.i_uvt,
        TC = o.c_uvt;
    var texCoordsOrderedWithVertices = new Array(o.c_verts.length);
    texCoordsOrderedWithVertices.fill(-1);
    for (let i = 0; i < l; i++) {
        let x = VI[i] * 3;
        let y = TI[i] * 2;
        texCoordsOrderedWithVertices[x] = TC[y];
        texCoordsOrderedWithVertices[x + 1] = TC[y + 1];
        texCoordsOrderedWithVertices[x + 2] = 0;
    }

    return texCoordsOrderedWithVertices;
}

function loadedObj(data) {
    const objectList = Object.values(objects);
    let obj = loadOBJFromBuffer(data);
    let jsObj = objectList[currentObject];
    jsObj['indices'] = obj.i_verts;
    jsObj['vertices'] = obj.c_verts;
    jsObj['numVerts'] = jsObj['indices'].length;
    jsObj['normals'] = getOrderedNormalsFromObj(obj);
    jsObj['texCoords'] = getOrderedTextureCoordsFromObj(obj);
    currentObject++;
    if (currentObject < objectList.length) {
        loadOBJFromPath(objectList[currentObject]['objPath'], loadedObj);
    } else {
        setupAfterDataLoad();
    }
}

function configureTextures(obj) {
    obj['texture'] = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, obj['texture']);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    obj['textureImage'] = document.getElementById(obj['textureHtmlId']);
    
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        obj['textureImage']
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.NEAREST_MIPMAP_LINEAR
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    obj['normal'] = gl.createTexture();
    obj['normalImage'] = document.getElementById(obj['normalHtmlId']);
    gl.bindTexture(gl.TEXTURE_2D, obj['normal']);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        obj['textureImage']
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.NEAREST_MIPMAP_LINEAR
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

}

function setupObjectShaderBuffers(obj) {
    // init shaders
    obj['shader'] = initShaders(gl, obj['vertexShader'], obj['fragmentShader']);

    // use shaders
    gl.useProgram(obj['shader']);

    // index buffer
    obj['indexBuffer'] = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj['indexBuffer']);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(obj['indices']),
        gl.STATIC_DRAW
    );

    // vertex buffer
    obj['vertexBuffer'] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj['vertexBuffer']);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(obj['vertices']),
        gl.STATIC_DRAW
    );

    // texture buffer
    obj['textureBuffer'] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj['textureBuffer']);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(obj['texCoords']),
        gl.STATIC_DRAW
    );

    // normal buffer
    obj['normalBuffer'] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj['normalBuffer']);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(obj['normalCoords']),
        gl.STATIC_DRAW
    );

    // model view matrix location
    obj['modelViewMatrixLoc'] = gl.getUniformLocation(
        obj['shader'],
        'modelViewMatrix'
    );

    // projection matrix location
    obj['projectionMatrixLoc'] = gl.getUniformLocation(
        obj['shader'],
        'projectionMatrix'
    );

    // scale matrix
    obj['scaleLoc'] = gl.getUniformLocation(obj['shader'], 'scale');

    // translation matrix
    obj['translationLoc'] = gl.getUniformLocation(obj['shader'], 'translation');

    // rotation matrix
    obj['rotationLoc'] = gl.getUniformLocation(obj['shader'], 'rotation');

    // vertex position
    obj['vPosition'] = gl.getAttribLocation(obj['shader'], 'vPosition');

    // texture coord
    obj['tPosition'] = gl.getAttribLocation(obj['shader'], 'tPosition');

    // normal texture
    obj['nPosition'] = gl.getAttribLocation(obj['shader'], 'nPosition');
}

function renderObject(obj) {
    gl.useProgram(obj['shader']);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj['indexBuffer']);

    // pass vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, obj['vertexBuffer']);
    gl.vertexAttribPointer(obj['vPosition'], 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(obj['vPosition']);

    // pass texture coords
    gl.bindBuffer(gl.ARRAY_BUFFER, obj['textureBuffer']);
    gl.vertexAttribPointer(obj['tPosition'], 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(obj['tPosition']);

    // pass normal coords
    gl.bindBuffer(gl.ARRAY_BUFFER, obj['normalBuffer']);
    gl.vertexAttribPointer(obj['nPosition'], 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(obj['nPosition']);
    
    // pass camera matrices
    gl.uniformMatrix4fv(
        obj['modelViewMatrixLoc'],
        false,
        flatten(modelViewMatrix)
    );

    gl.uniformMatrix4fv(
        obj['projectionMatrixLoc'],
        false,
        flatten(projectionMatrix)
    );

    // pass scale
    gl.uniformMatrix4fv(obj['scaleLoc'], false, flatten(obj['scale']));

    // pass translation
    gl.uniformMatrix4fv(
        obj['translationLoc'],
        false,
        flatten(obj['translation'])
    );

    // pass rotation
    gl.uniformMatrix4fv(obj['rotationLoc'], false, flatten(obj['rotation']));

    // pass default texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, obj['texture']);
    gl.uniform1i(gl.getUniformLocation(obj['shader'], 'defaultTex'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, obj['normal']);
    gl.uniform1i(gl.getUniformLocation(obj['shader'], 'normalMap'), 0);

    gl.drawElements(gl.TRIANGLES, obj['numVerts'], gl.UNSIGNED_SHORT, 0);
}

function setupAfterDataLoad() {
    gl.enable(gl.DEPTH_TEST);
    for (const obj of Object.values(objects)) {
        setupObjectShaderBuffers(obj);
        configureTextures(obj);
    }
    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for (const obj of Object.values(objects)) {
        if (obj['isRendering']) renderObject(obj);
    }
    requestAnimationFrame(render);
}

function setDefaultHtmlValues() {
    $('#render').prop('checked', true);
}

function setupOnClickListeners() {
    function getObjectKey() {
        return $('#objectSelect option:selected')[0].value;
    }

    function getSelectedObject() {
        return objects[getObjectKey()];
    }

    $('#objectSelect').on('change', () => {
        $('#render').prop('checked', getSelectedObject().isRendering);
    });

    $('#render').on('click', () => {
        const obj = getSelectedObject();
        obj.isRendering = !obj.isRendering;
    });

    $('.rotation').on('click', (e) => {
        const direction = e.target.id;
        const object = getSelectedObject();
        const angle = 10;
        const rotate = (a) => {
            return ['up', 'left', 'clockwise'].includes(direction)
                ? a + (angle % 360)
                : a - (angle % 360);
        };
        switch (direction) {
            case 'up':
            case 'down':
                return (object.rotateX[0] = rotate(object.rotateX[0]));
            case 'right':
            case 'left':
                return (object.rotateY[0] = rotate(object.rotateY[0]));
            case 'counterclockwise':
            case 'clockwise':
                return (object.rotateZ[0] = rotate(object.rotateZ[0]));
        }
    });

    $('.translation').on('click', (e) => {
        const direction = e.target.id;
        const object = getSelectedObject();
        const delta = 0.1;
        const translate = (v) => {
            return direction.includes('Plus') ? v + delta : v - delta;
        };
        const getDimension = () => {
            switch (direction) {
                case 'xPlus':
                case 'xMinus':
                    return 0;
                case 'yPlus':
                case 'yMinus':
                    return 1;
                case 'zPlus':
                case 'zMinus':
                    return 2;
            }
        };
        const dimension = getDimension();
        object.translationVector[dimension] = translate(
            object.translationVector[dimension]
        );
    });

    $('#restore').on('click', () => {
        const objectKey = getObjectKey();
        const defaultObject = defaults[objectKey];
        const obj = objects[objectKey];
        for (const [key, val] of Object.entries(defaultObject)) {
            obj[key] = Array.isArray(val) ? [...val] : val;
        }
        $('#render').prop('checked', true);
    });
}

window.onload = function init() {
    canvas = document.getElementById('gl-canvas');

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    // set up gl vars
    gl.viewport(0, 0, canvas.width, canvas.height);
    aspect = canvas.width / canvas.height;
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // set default html values
    setDefaultHtmlValues();

    // set up click listeners
    setupOnClickListeners();

    // start loading objects
    loadOBJFromPath(Object.values(objects)[0]['objPath'], loadedObj);
};
