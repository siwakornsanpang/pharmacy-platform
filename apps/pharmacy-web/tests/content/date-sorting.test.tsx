import React from 'react';
import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import NewsContainer from '../../components/public/06_news/NewsContainer';
import PeopleProjectContainer from '../../components/public/04_service/people-project/PeopleProjectContainer';

const article=(id:number,publishedAt:string|null,createdAt:string)=>({
  id,title:`Article ${id}`,content:undefined,createdAt,excerpt:null,thumbnailUrl:null,
  status:'published' as const,category:'news' as const,publishedAt,isHighlight:false,
});

test('news and project lists sort nullable publication dates by the preserved createdAt fallback',()=>{
  const rows=[article(2,'2026-01-01T00:00:00.000Z','2026-03-01T00:00:00.000Z'),article(1,null,'2026-02-01T00:00:00.000Z')];
  const news=render(<NewsContainer allNews={rows}/>);
  expect([...news.container.querySelectorAll('a[href^="/news/"]')].map(link=>link.getAttribute('href'))).toEqual(['/news/1','/news/2']);
  news.unmount();
  const projects=render(<PeopleProjectContainer allProjects={rows.map(row=>({...row,category:'public'}))}/>);
  expect([...projects.container.querySelectorAll('a[href^="/service/people-project/"]')].map(link=>link.getAttribute('href'))).toEqual(['/service/people-project/1','/service/people-project/2']);
});
