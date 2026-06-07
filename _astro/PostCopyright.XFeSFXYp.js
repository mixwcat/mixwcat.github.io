import{j as e}from"./jsx-runtime.DtD2S6Vj.js";import{b as c,s as f}from"./config.D9lA6OJ6.js";import{c as d}from"./date.Dfx-CKFM.js";import{r as i}from"./index.C-7etoUd.js";import{B as m}from"./react-toastify.esm.CzcO4wKf.js";import"./clsx.B-dksMZM.js";const p=`<svg viewBox="0 0 600 100" xmlns="http://www.w3.org/2000/svg" width="250" height="40" role="img" aria-label="mixwcat">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&amp;display=swap');

    .sig {
      font-family: 'Playfair Display', serif;
      font-style: italic;
      font-weight: 1000;
      font-size: 100px;
      fill: #8fa4b8;
      dominant-baseline: middle;
      text-anchor: middle;
      transition: fill 0.35s ease;
    }

    #signature:hover .sig {
      fill: #ffffff;
      filter: url(#glow);
    }
  </style>

  <defs>
    <!-- 光束定义：中心为白（可见），外围黑（不可见），cx 从 0% -> 100% 移动 -->
    <radialGradient id="beam" cx="0%" cy="50%" r="70%" gradientUnits="objectBoundingBox">
      <!-- 白色中心与柔和边缘 -->
      <stop offset="0%" stop-color="white" stop-opacity="1"/>
      <stop offset="40%" stop-color="white" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="black" stop-opacity="0.0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.0"/>
      <!-- 控制光束左右移动 -->
      <animate 
  attributeName="cx" 
  values="-20%; 120%; 120%" 
  dur="6s" 
  keyTimes="0; 0.8; 1" 
  repeatCount="indefinite" />
      <!-- 纵向微动 -->
      <animate attributeName="cy" values="48%;52%;48%" dur="2.5s" repeatCount="indefinite" />
    </radialGradient>

    <!-- mask：先用黑色遮住全文字，再把光束画上去（光束区域为白 => 可见） -->
    <mask id="beamMask">
      <rect width="100%" height="100%" fill="black"/>
      <rect width="100%" height="100%" fill="url(#beam)"/>
    </mask>

    <!-- 发光滤镜 -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- 背景（可选） -->
  <rect width="100%" height="100%" fill="transparent" />

  <!-- 用 g 包裹实现整块区域 hover -->
  <g id="signature">
    <rect width="100%" height="100%" fill="transparent"/>
    <!-- 文本：被 mask 控制，只在光束处可见 -->
    <text x="50%" y="50%" class="sig" mask="url(#beamMask)">
      mixwcat
    </text>
  </g>
</svg>
`;function h(){return e.jsx("div",{className:"animated-signature",dangerouslySetInnerHTML:{__html:p}})}function g(n){return new URL(n,f.url).href}function v({title:n,slug:r,lastMod:t}){const[a,o]=i.useState(""),s=g(r);function l(){navigator.clipboard.writeText(s),m.success("已复制文章链接")}return i.useEffect(()=>{o(d(t))},[t]),e.jsxs("section",{className:"text-xs leading-loose text-secondary",children:[e.jsxs("p",{children:["文章标题：",n]}),e.jsxs("p",{children:["文章作者：",c.name]}),e.jsxs("p",{children:[e.jsxs("span",{children:["文章链接：",s]}),e.jsx("span",{role:"button",className:"cursor-pointer select-none",onClick:l,children:"[复制]"})]}),e.jsxs("p",{children:["最后修改时间：",a]}),e.jsx("hr",{className:"my-3 border-primary"}),e.jsxs("div",{children:[e.jsx("div",{className:"float-right ml-4 my-2",children:e.jsx(h,{})}),e.jsxs("p",{children:["感谢阅读！如果您喜欢这篇文章，欢迎分享给更多人。",e.jsx("br",{}),"本文采用",e.jsx("a",{className:"hover:underline hover:text-accent underline-offset-2",href:"https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh",target:"_blank",rel:"noopener noreferrer",children:"CC BY-NC-SA 4.0"}),"进行许可。"]})]})]})}export{v as PostCopyright};
