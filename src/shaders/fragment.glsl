uniform float uTime;
uniform float uRadius;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;

vec3 offset = vec3(0.1, 0.1, 3);

void main(){
    gl_FragColor = vec4(vPosition+offset, 1);

    vec3 viewDir = normalize(vPosition - cameraPosition);
    // gl_FragColor =  vec4(0.5 + 0.5 * cos(uTime + vPosition.x + vPosition.y + vPosition.z), 0.5 + 0.5 * sin(uTime + vPosition.x + vPosition.y + vPosition.z), 0.5 + 0.5 * cos(uTime + vPosition.x + vPosition.y + vPosition.z), 1.0);
    // gl_FragColor = vec4(viewDir, 1.0);

    // float fresnel = 1 - dot(viewDir, vNormal);
    // gl_FragColor = vec4(vec3(fresnel), 1.0);
}