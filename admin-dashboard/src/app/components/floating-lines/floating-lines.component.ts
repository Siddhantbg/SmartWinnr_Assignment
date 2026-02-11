import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
  Vector2,
  Clock,
} from 'three';

const vertexShader = `
precision highp float;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;

uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;

uniform vec3 lineGradient[8];
uniform int lineGradientCount;

const vec3 BLACK = vec3(0.0);
const vec3 PINK  = vec3(233.0, 71.0, 245.0) / 255.0;
const vec3 BLUE  = vec3(47.0,  75.0, 162.0) / 255.0;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 background_color(vec2 uv) {
  vec3 col = vec3(0.0);
  float y = sin(uv.x - 0.2) * 0.3 - 0.1;
  float m = uv.y - y;
  col += mix(BLUE, BLACK, smoothstep(0.0, 1.0, abs(m)));
  col += mix(PINK, BLACK, smoothstep(0.0, 1.0, abs(m - 0.8)));
  return col * 0.5;
}

vec3 getLineColor(float t, vec3 baseColor) {
  if (lineGradientCount <= 0) {
    return baseColor;
  }
  vec3 gradientColor;
  if (lineGradientCount == 1) {
    gradientColor = lineGradient[0];
  } else {
    float clampedT = clamp(t, 0.0, 0.9999);
    float scaled = clampedT * float(lineGradientCount - 1);
    int idx = int(floor(scaled));
    float f = fract(scaled);
    int idx2 = min(idx + 1, lineGradientCount - 1);
    vec3 c1 = lineGradient[idx];
    vec3 c2 = lineGradient[idx2];
    gradientColor = mix(c1, c2, f);
  }
  return gradientColor * 0.5;
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;
  float x_offset   = offset;
  float x_movement = time * 0.1;
  float amp        = sin(offset + time * 0.2) * 0.3;
  float y          = sin(uv.x + x_offset + x_movement) * amp;
  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius);
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }
  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;
  if (parallax) {
    baseUv += parallaxOffset;
  }
  vec3 col = vec3(0.0);
  vec3 b = lineGradientCount > 0 ? vec3(0.0) : background_color(baseUv);
  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }

  if (enableBottom) {
    for (int i = 0; i < bottomLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(bottomLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
        1.5 + 0.2 * fi, baseUv, mouseUv, interactive
      ) * 0.2;
    }
  }

  if (enableMiddle) {
    for (int i = 0; i < middleLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(middleLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
        2.0 + 0.15 * fi, baseUv, mouseUv, interactive
      );
    }
  }

  if (enableTop) {
    for (int i = 0; i < topLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(topLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      float angle = topWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      ruv.x *= -1.0;
      col += lineCol * wave(
        ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
        1.0 + 0.2 * fi, baseUv, mouseUv, interactive
      ) * 0.1;
    }
  }

  fragColor = vec4(col, 1.0);
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`;

const MAX_GRADIENT_STOPS = 8;

interface WavePosition {
  x: number;
  y: number;
  rotate: number;
}

function hexToVec3(hex: string): Vector3 {
  let value = hex.trim();
  if (value.startsWith('#')) {
    value = value.slice(1);
  }
  let r = 255, g = 255, b = 255;
  if (value.length === 3) {
    r = parseInt(value[0] + value[0], 16);
    g = parseInt(value[1] + value[1], 16);
    b = parseInt(value[2] + value[2], 16);
  } else if (value.length === 6) {
    r = parseInt(value.slice(0, 2), 16);
    g = parseInt(value.slice(2, 4), 16);
    b = parseInt(value.slice(4, 6), 16);
  }
  return new Vector3(r / 255, g / 255, b / 255);
}

@Component({
  selector: 'app-floating-lines',
  standalone: true,
  template: `<div #container class="floating-lines-container"></div>`,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .floating-lines-container {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    }
  `],
})
export class FloatingLinesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  @Input() linesGradient?: string[];
  @Input() enabledWaves: Array<'top' | 'middle' | 'bottom'> = ['top', 'middle', 'bottom'];
  @Input() lineCount: number | number[] = [6];
  @Input() lineDistance: number | number[] = [5];
  @Input() topWavePosition?: WavePosition;
  @Input() middleWavePosition?: WavePosition;
  @Input() bottomWavePosition: WavePosition = { x: 2.0, y: -0.7, rotate: -1 };
  @Input() animationSpeed = 1;
  @Input() interactive = true;
  @Input() bendRadius = 5.0;
  @Input() bendStrength = -0.5;
  @Input() mouseDamping = 0.05;
  @Input() parallax = true;
  @Input() parallaxStrength = 0.2;

  private raf = 0;
  private renderer?: WebGLRenderer;
  private geometry?: PlaneGeometry;
  private material?: ShaderMaterial;
  private ro?: ResizeObserver;

  private targetMouse = new Vector2(-1000, -1000);
  private currentMouse = new Vector2(-1000, -1000);
  private targetInfluence = 0;
  private currentInfluence = 0;
  private targetParallax = new Vector2(0, 0);
  private currentParallax = new Vector2(0, 0);

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.renderer) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dpr = this.renderer.getPixelRatio();

    this.targetMouse.set(x * dpr, (rect.height - y) * dpr);
    this.targetInfluence = 1.0;

    if (this.parallax) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const offsetX = (x - centerX) / rect.width;
      const offsetY = -(y - centerY) / rect.height;
      this.targetParallax.set(offsetX * this.parallaxStrength, offsetY * this.parallaxStrength);
    }
  };

  private handlePointerLeave = () => {
    this.targetInfluence = 0.0;
  };

  private getLineCount(waveType: 'top' | 'middle' | 'bottom'): number {
    if (typeof this.lineCount === 'number') return this.lineCount;
    if (!this.enabledWaves.includes(waveType)) return 0;
    const index = this.enabledWaves.indexOf(waveType);
    return this.lineCount[index] ?? 6;
  }

  private getLineDistance(waveType: 'top' | 'middle' | 'bottom'): number {
    if (typeof this.lineDistance === 'number') return this.lineDistance;
    if (!this.enabledWaves.includes(waveType)) return 0.1;
    const index = this.enabledWaves.indexOf(waveType);
    return this.lineDistance[index] ?? 0.1;
  }

  ngAfterViewInit(): void {
    const container = this.containerRef.nativeElement;

    const topLC = this.enabledWaves.includes('top') ? this.getLineCount('top') : 0;
    const middleLC = this.enabledWaves.includes('middle') ? this.getLineCount('middle') : 0;
    const bottomLC = this.enabledWaves.includes('bottom') ? this.getLineCount('bottom') : 0;

    const topLD = this.enabledWaves.includes('top') ? this.getLineDistance('top') * 0.01 : 0.01;
    const middleLD = this.enabledWaves.includes('middle') ? this.getLineDistance('middle') * 0.01 : 0.01;
    const bottomLD = this.enabledWaves.includes('bottom') ? this.getLineDistance('bottom') * 0.01 : 0.01;

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 1;

    this.renderer = new WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    const uniforms: Record<string, { value: unknown }> = {
      iTime: { value: 0 },
      iResolution: { value: new Vector3(1, 1, 1) },
      animationSpeed: { value: this.animationSpeed },
      enableTop: { value: this.enabledWaves.includes('top') },
      enableMiddle: { value: this.enabledWaves.includes('middle') },
      enableBottom: { value: this.enabledWaves.includes('bottom') },
      topLineCount: { value: topLC },
      middleLineCount: { value: middleLC },
      bottomLineCount: { value: bottomLC },
      topLineDistance: { value: topLD },
      middleLineDistance: { value: middleLD },
      bottomLineDistance: { value: bottomLD },
      topWavePosition: {
        value: new Vector3(
          this.topWavePosition?.x ?? 10.0,
          this.topWavePosition?.y ?? 0.5,
          this.topWavePosition?.rotate ?? -0.4,
        ),
      },
      middleWavePosition: {
        value: new Vector3(
          this.middleWavePosition?.x ?? 5.0,
          this.middleWavePosition?.y ?? 0.0,
          this.middleWavePosition?.rotate ?? 0.2,
        ),
      },
      bottomWavePosition: {
        value: new Vector3(
          this.bottomWavePosition.x,
          this.bottomWavePosition.y,
          this.bottomWavePosition.rotate,
        ),
      },
      iMouse: { value: new Vector2(-1000, -1000) },
      interactive: { value: this.interactive },
      bendRadius: { value: this.bendRadius },
      bendStrength: { value: this.bendStrength },
      bendInfluence: { value: 0 },
      parallax: { value: this.parallax },
      parallaxStrength: { value: this.parallaxStrength },
      parallaxOffset: { value: new Vector2(0, 0) },
      lineGradient: {
        value: Array.from({ length: MAX_GRADIENT_STOPS }, () => new Vector3(1, 1, 1)),
      },
      lineGradientCount: { value: 0 },
    };

    if (this.linesGradient && this.linesGradient.length > 0) {
      const stops = this.linesGradient.slice(0, MAX_GRADIENT_STOPS);
      uniforms['lineGradientCount'].value = stops.length;
      stops.forEach((hex, i) => {
        const color = hexToVec3(hex);
        (uniforms['lineGradient'].value as Vector3[])[i].set(color.x, color.y, color.z);
      });
    }

    this.material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    this.geometry = new PlaneGeometry(2, 2);
    const mesh = new Mesh(this.geometry, this.material);
    scene.add(mesh);

    const clock = new Clock();

    const setSize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      this.renderer!.setSize(width, height, false);
      const cw = this.renderer!.domElement.width;
      const ch = this.renderer!.domElement.height;
      (uniforms['iResolution'].value as Vector3).set(cw, ch, 1);
    };
    setSize();

    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(setSize);
      this.ro.observe(container);
    }

    if (this.interactive) {
      this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
      this.renderer.domElement.addEventListener('pointerleave', this.handlePointerLeave);
    }

    const renderLoop = () => {
      uniforms['iTime'].value = clock.getElapsedTime();

      if (this.interactive) {
        this.currentMouse.lerp(this.targetMouse, this.mouseDamping);
        (uniforms['iMouse'].value as Vector2).copy(this.currentMouse);
        this.currentInfluence += (this.targetInfluence - this.currentInfluence) * this.mouseDamping;
        uniforms['bendInfluence'].value = this.currentInfluence;
      }

      if (this.parallax) {
        this.currentParallax.lerp(this.targetParallax, this.mouseDamping);
        (uniforms['parallaxOffset'].value as Vector2).copy(this.currentParallax);
      }

      this.renderer!.render(scene, camera);
      this.raf = requestAnimationFrame(renderLoop);
    };
    renderLoop();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();

    if (this.interactive && this.renderer) {
      this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
      this.renderer.domElement.removeEventListener('pointerleave', this.handlePointerLeave);
    }

    this.geometry?.dispose();
    this.material?.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }
  }
}
