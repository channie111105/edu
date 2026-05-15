import{R as o,j as e}from"./index-J9EhbXAC.js";import{C as t}from"./circle-x-BbGzAGTQ.js";import{I as l}from"./info-CIy9XVJB.js";import{C as c}from"./circle-alert-DkeTRqy5.js";import{C as x}from"./circle-check-HZE9iv9H.js";const p=({message:a,type:r,onClose:s})=>{o.useEffect(()=>{const m=setTimeout(()=>{s()},3e3);return()=>clearTimeout(m)},[s]);const i={success:"bg-green-50 border-green-500 text-green-900",error:"bg-red-50 border-red-500 text-red-900",warning:"bg-amber-50 border-amber-500 text-amber-900",info:"bg-blue-50 border-blue-500 text-blue-900"},n={success:e.jsx(x,{size:20,className:"text-green-600"}),error:e.jsx(t,{size:20,className:"text-red-600"}),warning:e.jsx(c,{size:20,className:"text-amber-600"}),info:e.jsx(l,{size:20,className:"text-blue-600"})};return e.jsxs(e.Fragment,{children:[e.jsx("style",{children:`
            @keyframes slideIn {
               from {
                  transform: translateX(100%);
                  opacity: 0;
               }
               to {
                  transform: translateX(0);
                  opacity: 1;
               }
            }
            .animate-slide-in {
               animation: slideIn 0.3s ease-out;
            }
         `}),e.jsx("div",{className:`fixed top-4 right-4 z-50 min-w-[300px] max-w-md p-4 rounded-lg border-l-4 shadow-lg ${i[r]} animate-slide-in`,children:e.jsxs("div",{className:"flex items-start gap-3",children:[n[r],e.jsx("div",{className:"flex-1",children:e.jsx("p",{className:"text-sm font-medium whitespace-pre-line",children:a})}),e.jsx("button",{onClick:s,className:"text-slate-400 hover:text-slate-600",children:e.jsx(t,{size:16})})]})})]})};export{p as T};
