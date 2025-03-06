export default class WebResponse<T> {
  data?: T;
  errors?: string;
  paging?: Paging;
  statusCode?: number;
  timestamp?: string;
}

export class Paging {
  size: number;
  total_pages: number;
  current_page: number;
}

export function response<T> (
  data: T,
  statusCode: number,
  paging?: Paging
): WebResponse<T> {
  return {
    data,
    statusCode,
    timestamp: new Date().toString(),
    ...(paging ? { paging } : {}),
  };
}