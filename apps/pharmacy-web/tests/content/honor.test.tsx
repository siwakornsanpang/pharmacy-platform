import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import HalloffameContent from '../../components/public/02_about/hall-of-fame/HalloffameContent';

test('honor list stays body-free and loads sanitized detail exactly once after selection', async () => {
 const member = {id:1,awardId:1,order:1,prefix:'',name:'<b>literal</b>',awardName:'Award',workName:'Work',imageUrl:'',videoUrl:'',awardDetail:'plain'};
 const detail = {...member,fullDetail:'<p>detail-only body<img src="/media/a.png" onerror="alert(1)"></p>'};
 const fetchMock=vi.fn(async(input: RequestInfo | URL)=>{
  expect(String(input)).toContain('/honor/1');
  return new Response(JSON.stringify(detail),{status:200,headers:{'content-type':'application/json'}});
 });
 vi.stubGlobal('fetch',fetchMock);
 const {container}=render(<HalloffameContent initialData={[member as never]}/>);
 expect(member).not.toHaveProperty('fullDetail');
 expect(fetchMock).not.toHaveBeenCalled();
 expect(screen.queryByText('detail-only body')).toBeNull();
 expect(screen.getByText('plain')).toBeTruthy();
 fireEvent.change(screen.getByPlaceholderText('ค้นหาชื่อบุคคล'),{target:{value:'plain'}});
 expect(screen.getByRole('button',{name:'ดูรายละเอียด <b>literal</b>'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'ดูรายละเอียด <b>literal</b>'}));
 expect(await screen.findByRole('dialog')).toHaveTextContent('<b>literal</b>');
 expect(await screen.findByText('detail-only body')).toBeTruthy();
 await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(1));
 expect(container.querySelector('[onerror]')).toBeNull();
});
