// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
vi.mock('next/dynamic',()=>({default:()=>function Quill(props: {value:string;onChange:(value:string)=>void;formats:string[]}) {
 return <><div data-testid="editor-load" dangerouslySetInnerHTML={{__html:props.value}}/><button onClick={()=>props.onChange('<p>safe</p><img src=x onerror=x><span class="ql-formula">formula</span>')}>export</button><span>{props.formats.includes('formula')?'formula enabled':'formula disabled'}</span><span>{props.formats.includes('video')?'video enabled':'video disabled'}</span></>;
}}));
import Editor from '../../src/app/components/editor/editor';
test('actual editor component sanitizes load/output and disables active formula/video insertion',()=>{
 const onChange=vi.fn();render(<Editor value='<p>safe</p><img src=x onerror=x><span class="ql-formula">formula</span>' onChange={onChange}/>);
 expect(screen.getByTestId('editor-load').innerHTML).toBe('<p>safe</p>');
 expect(screen.getByText('formula disabled')).toBeTruthy();
 expect(screen.getByText('video disabled')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'export'}));expect(onChange).toHaveBeenCalledWith('<p>safe</p>');
});
