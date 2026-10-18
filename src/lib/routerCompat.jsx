'use client';
import React, { useCallback, useMemo } from 'react';
import NextLink from 'next/link';
import {
  useRouter as useNextRouter,
  usePathname as useNextPathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from 'next/navigation';

export function Link({ to, href, children, ...props }) {
  const destination = to || href || '#';
  return (
    <NextLink href={destination} {...props}>
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useNextRouter();
  return useCallback((to, options = {}) => {
    if (typeof to === 'number') {
      if (to === -1) router.back();
      return;
    }
    if (options && options.replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [router]);
}

export function useParams() {
  const params = useNextParams();
  return params || {};
}

export function usePathname() {
  return useNextPathname();
}

export function useLocation() {
  const pathname = useNextPathname() || '/';
  return useMemo(() => {
    let search = '';
    if (typeof window !== 'undefined') {
      search = window.location.search || '';
    }
    return {
      pathname,
      search,
      hash: ''
    };
  }, [pathname]);
}

export function useSearchParams() {
  const router = useNextRouter();
  const pathname = useNextPathname() || '/';
  let searchParams = null;
  try {
    searchParams = useNextSearchParams();
  } catch (e) {}

  const setSearchParams = useCallback((nextParams) => {
    let queryStr = '';
    if (typeof nextParams === 'function') {
      const current = new URLSearchParams(
        typeof window !== 'undefined' ? window.location.search : (searchParams?.toString() || '')
      );
      const updated = nextParams(current);
      queryStr = updated.toString();
    } else if (nextParams instanceof URLSearchParams) {
      queryStr = nextParams.toString();
    } else if (typeof nextParams === 'object') {
      const sp = new URLSearchParams(nextParams);
      queryStr = sp.toString();
    }
    const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
    router.push(targetUrl, { scroll: false });
  }, [router, pathname, searchParams]);

  const currentParams = useMemo(() => {
    if (searchParams) return new URLSearchParams(searchParams.toString());
    if (typeof window !== 'undefined') return new URLSearchParams(window.location.search);
    return new URLSearchParams();
  }, [searchParams]);

  return [currentParams, setSearchParams];
}

export default {
  Link,
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
  usePathname
};
