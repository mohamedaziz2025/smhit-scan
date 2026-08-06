import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/auth_state.dart';
import '../features/admin/products_screen.dart';
import '../features/admin/settings_screen.dart';
import '../features/admin/users_screen.dart';
import '../features/analytics/analytics_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/clients/client_detail_screen.dart';
import '../features/clients/clients_screen.dart';
import '../features/fiche/fiche_edit_screen.dart';
import '../features/fiche/my_fiches_screen.dart';
import '../features/home/home_screen.dart';
import '../features/reports/report_detail_screen.dart';
import '../features/reports/reports_screen.dart';
import '../features/scan/scan_screen.dart';

/// Navigation par rôle (§11) : go_router + guards.
/// - AGENT            : /scan, /fiche/:id/edit, /my-fiches
/// - ADMIN/SUPER_ADMIN : /clients, /reports, /analytics (+ web parity)
/// - SUPER_ADMIN       : /admin/users, /admin/products, /admin/settings
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);
  final role = authState.user?.role;

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final loggedIn = authState.isAuthenticated;
      final goingToLogin = state.matchedLocation == '/login';

      if (!loggedIn && !goingToLogin) return '/login';
      if (loggedIn && goingToLogin) return '/home';

      final adminOnly = state.matchedLocation.startsWith('/admin');
      final superAdminOnly = state.matchedLocation.startsWith('/admin/');
      if (loggedIn) {
        if (superAdminOnly && role != UserRole.superAdmin) return '/home';
        if (adminOnly && role != UserRole.admin && role != UserRole.superAdmin) {
          return '/home';
        }
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/home', builder: (_, _) => const HomeScreen()),

      // --- AGENT ---
      GoRoute(path: '/scan', builder: (_, _) => const ScanScreen()),
      GoRoute(
        path: '/fiche/:id/edit',
        builder: (_, state) => FicheEditScreen(ficheId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/my-fiches', builder: (_, _) => const MyFichesScreen()),

      // --- ADMIN / SUPER_ADMIN ---
      GoRoute(path: '/clients', builder: (_, _) => const ClientsScreen()),
      GoRoute(
        path: '/client/:id',
        builder: (_, state) => ClientDetailScreen(clientId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/reports', builder: (_, _) => const ReportsScreen()),
      GoRoute(
        path: '/report/:id',
        builder: (_, state) => ReportDetailScreen(reportId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/analytics', builder: (_, _) => const AnalyticsScreen()),

      // --- SUPER_ADMIN ---
      GoRoute(path: '/admin/users', builder: (_, _) => const AdminUsersScreen()),
      GoRoute(path: '/admin/products', builder: (_, _) => const AdminProductsScreen()),
      GoRoute(path: '/admin/settings', builder: (_, _) => const AdminSettingsScreen()),
    ],
  );
});
