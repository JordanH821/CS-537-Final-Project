'use strict';

var canvas;
var gl;
var aspect;
var modelViewMatrix = lookAt(
    vec3(0.0, 0.0, 1) /* */,
    vec3(0, 0, 0) /* looking at */,
    vec3(0, 1, 0) /* up */
);
var projectionMatrix = perspective(90.0, aspect, 0.2, 100);

let currentObject = 0;
let objectList = [];


let pumpkin = {
    objPath: './objs/pumpkin/pumpkin.obj',
    textureHtmlId: 'pumpkinTexture',
    vertexShader: 'pumpkin-vertex-shader',
    fragmentShader: 'pumpkin-fragment-shader',
    scale: scalem(0.01, 0.01, 0.01),
    translation: translate(-0.25, 0.25, 0),
    rotation: rotate(180, 0, 1, 0),
}

objectList.push(pumpkin);

let rock = {
    objPath: './objs/rock/rock.obj',
    textureHtmlId: 'rockTexture',
    vertexShader: 'pumpkin-vertex-shader',
    fragmentShader: 'pumpkin-fragment-shader',
    scale: scalem(0.01, 0.01, 0.01),
    translation: translate(-0.25, 0.25, 0),
    rotation: rotate(180, 0, 1, 0)
}

objectList.push(rock);

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
    console.log(obj['textureHtmlId']);
    console.log(obj['textureImage']);
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

    gl.drawElements(gl.TRIANGLES, obj['numVerts'], gl.UNSIGNED_SHORT, 0);
}

function setupAfterDataLoad() {
    gl.enable(gl.DEPTH_TEST);
    for (const obj of objectList) {
        setupObjectShaderBuffers(obj);
        configureTextures(obj);
    }
    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for (const obj of objectList) {
        renderObject(obj);
    }
    requestAnimationFrame(render);
}

window.onload = function init() {
    canvas = document.getElementById('gl-canvas');

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    // setup gl vars
    gl.viewport(0, 0, canvas.width, canvas.height);
    aspect = canvas.width / canvas.height;
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // start loading objects
    loadOBJFromPath(objectList[0]['objPath'], loadedObj);
};
