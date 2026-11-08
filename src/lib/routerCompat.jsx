'use client';
import React, { useCallback, useMemo } from 'react';
import NextLink from 'next/link';
import {
  useRouter as useNextRouter,
  usePathname as useNextPathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from 'next/navigation';

export function Link({ to, href, children, prefetch = true, onMouseEnter, onTouchStart, ...props }) {
  const destination = to || href || '#';
  const router = useNextRouter();

  const handleMouseEnter = (e) => {
    if (typeof destination === 'string' && destination.startsWith('/') && destination !== '#') {
      try {
        router.prefetch(destination);
      } catch (err) {}
    }
    if (onMouseEnter) onMouseEnter(e);
  };

  const handleTouchStart = (e) => {
    if (typeof destination === 'string' && destination.startsWith('/') && destination !== '#') {
      try {
        router.prefetch(destination);
      } catch (err) {}
    }
    if (onTouchStart) onTouchStart(e);
  };

  return (
    <NextLink
      href={destination}
      prefetch={prefetch}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      {...props}
    >
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useNextRouter();
  const currentPathname = useNextPathname();

  const navigate = useCallback((to, options = {}) => {
    if (typeof to === 'number') {
      if (to === -1) router.back();
      return;
    }

    // Prevent duplicate navigation to current exact route
    if (typeof to === 'string' && to === currentPathname && !options?.force) {
      return;
    }

    if (options && options.replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [router, currentPathname]);

  navigate.prefetch = (to) => {
    if (typeof to === 'string' && to.startsWith('/')) {
      try {
        router.prefetch(to);
      } catch (err) {}
    }
  };

  return navigate;
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
  const searchParams = useNextSearchParams();

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
