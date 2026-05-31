import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'main_scaffold.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/auth_provider.dart';
import '../features/ootd/ootd_upload_screen.dart';
import '../features/ootd/item_edit_screen.dart';
import '../features/card/card_screen.dart';
import '../features/card/card_generation_screen.dart';
import '../shared/models/ootd_item.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);
      final isLoginRoute = state.matchedLocation == '/login';

      // 세션 초기화 중(loading)이면 redirect 보류
      if (authState.isLoading) return null;

      // 세션 복원 완료 후 currentSession으로 판단
      final session = Supabase.instance.client.auth.currentSession;

      if (session == null && !isLoginRoute) return '/login';
      if (session != null && isLoginRoute) return '/home';
      return null;
    },
    refreshListenable: _AuthChangeNotifier(ref),
    routes: _routes,
  );
});

// GoRouter refreshListenable용 — authState 변경 시 라우터 재평가
class _AuthChangeNotifier extends ChangeNotifier {
  _AuthChangeNotifier(Ref ref) {
    ref.listen(authStateProvider, (_, __) => notifyListeners());
  }
}

final _routes = [
  GoRoute(
    path: '/login',
    builder: (context, state) => const LoginScreen(),
  ),
  GoRoute(
    path: '/home',
    builder: (context, state) => const MainScaffold(initialTab: 0),
  ),
  GoRoute(
    path: '/shop',
    builder: (context, state) => const MainScaffold(initialTab: 1),
  ),
  GoRoute(
    path: '/profile',
    builder: (context, state) => const MainScaffold(initialTab: 2),
  ),
  GoRoute(
    path: '/ootd/upload',
    builder: (context, state) => const OotdUploadScreen(),
  ),
  GoRoute(
    path: '/ootd/edit',
    builder: (context, state) {
      final extra = state.extra as Map<String, dynamic>;
      final imagePath = extra['imagePath'] as String;
      return ItemEditScreen(
        imagePath: imagePath,
        originalImageUrl:
            extra['originalImageUrl'] as String? ?? imagePath,
        initialItems: extra['items'] as List<OotdItem>,
      );
    },
  ),
  GoRoute(
    path: '/card',
    builder: (context, state) => const CardScreen(),
  ),
  GoRoute(
    path: '/card/generate',
    builder: (context, state) {
      final extra = state.extra as Map<String, dynamic>;
      final imagePath = extra['imagePath'] as String;
      return CardGenerationScreen(
        imagePath: imagePath,
        originalImageUrl: extra['originalImageUrl'] as String? ?? imagePath,
        items: extra['items'] as List<OotdItem>,
        mood: extra['mood'] as String,
      );
    },
  ),
];

