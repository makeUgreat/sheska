import { SetMetadata } from '@nestjs/common';
import { type Permission as PermissionName } from '@sheska/contract';

/** 모든 route는 둘 중 하나를 선언한다. 선언하지 않은 route는 요청을 거부한다. */
export type RouteAccess = { readonly kind: 'public' } | { readonly kind: 'permission'; readonly permission: PermissionName };

export const ROUTE_ACCESS = 'sheska:route-access';

export const Public = () => SetMetadata(ROUTE_ACCESS, { kind: 'public' } satisfies RouteAccess);

export const Permission = (permission: PermissionName) =>
  SetMetadata(ROUTE_ACCESS, {
    kind: 'permission',
    permission,
  } satisfies RouteAccess);
