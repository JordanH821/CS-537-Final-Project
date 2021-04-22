'use strict';

var canvas;
var gl;
var aspect;
var modelViewMatrix = lookAt(
    vec3(0.0, 0.0, 0.0),
    vec3(0, 0, -10),
    vec3(0, 1, 0)
);
var projectionMatrix = perspective(90.0, aspect, 0.2, 100);

let kitty = {
    objPath: './objs/kitty/kitty.obj',
    vertexShader: 'kitty-vertex-shader',
    fragmentShader: 'kitty-fragment-shader',
};

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

function loadedKitty(data, _callback) {
    let kitty_obj = loadOBJFromBuffer(data);
    console.log(kitty_obj);
    kitty['indices'] = kitty_obj.i_verts;
    kitty['vertices'] = kitty_obj.c_verts;
    kitty['numVerts'] = kitty['indices'].length;
    kitty['normals'] = getOrderedNormalsFromObj(kitty_obj);
    kitty['texCoords'] = getOrderedTextureCoordsFromObj(kitty_obj);
    _callback();
}

function setupKittyShaderBuffers() {
    // init shaders
    kitty['shader'] = initShaders(
        gl,
        kitty['vertexShader'],
        kitty['fragmentShader']
    );

    // use shaders
    gl.useProgram(kitty['shader']);

    // index buffer
    kitty['indexBuffer'] = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, kitty['indexBuffer']);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(kitty['indices']),
        gl.STATIC_DRAW
    );

    // vertex buffer
    kitty['vertexBuffer'] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, kitty['vertexBuffer']);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(kitty['vertices']),
        gl.STATIC_DRAW
    );

    // model view matrix location
    kitty['modelViewMatrixLoc'] = gl.getUniformLocation(
        kitty['shader'],
        'modelViewMatrix'
    );

    // projection matrix location
    kitty['projectionMatrixLoc'] = gl.getUniformLocation(
        kitty['shader'],
        'projectionMatrix'
    );

    // vertex position
    kitty['vPosition'] = gl.getAttribLocation(kitty['shader'], 'vPosition');
}

function renderKitty() {
    gl.useProgram(kitty['shader']);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, kitty['indexBuffer']);

    // pass vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, kitty['vertexBuffer']);
    gl.vertexAttribPointer(kitty['vPosition'], 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(kitty['vPosition']);

    // pass camera matrices
    gl.uniformMatrix4fv(
        kitty['modelViewMatrixLoc'],
        false,
        flatten(modelViewMatrix)
    );
    gl.uniformMatrix4fv(
        kitty['projectionMatrixLoc'],
        false,
        flatten(projectionMatrix)
    );
    gl.drawElements(gl.TRIANGLES, kitty['numVerts'], gl.UNSIGNED_SHORT, 0);
}

function setupAfterDataLoad() {
    gl.enable(gl.DEPTH_TEST);
    setupKittyShaderBuffers();
    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    renderKitty();
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

    // load kitty
    loadOBJFromPath(kitty['objPath'], loadedKitty, () => {
        setupAfterDataLoad();
    });
};
