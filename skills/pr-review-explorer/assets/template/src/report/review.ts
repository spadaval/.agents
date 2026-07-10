export type Layer = { id:string; title:string; summary:string; focus:string[]; matches:(path:string)=>boolean };
export type Highlight = { file:string; side:'additions'|'deletions'; line:number; importance:'high'|'medium'; title:string; why:string; reviewQuestion:string };
export type StarredFile = { file:string; importance:'critical'|'high'; title:string; reason:string };
export const review = { layers: [] as Layer[] };
export const starredFiles: StarredFile[] = [];
export const highlights: Highlight[] = [];
