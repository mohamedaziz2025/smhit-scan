import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/token_storage.dart';
import 'api_config.dart';

/// Client Dio avec intercepteur : attache l'access token à chaque requête et
/// tente un refresh automatique sur 401 (l'access token dure 15 min — sans
/// ça, l'utilisateur serait déconnecté en pleine saisie de fiche).
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15), // upload d'images peut être lent sur le terrain
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await TokenStorage.getAccessToken();
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (error, handler) async {
        final isAuthRoute = error.requestOptions.path.contains('/auth/');
        if (error.response?.statusCode != 401 || isAuthRoute) {
          handler.next(error);
          return;
        }

        final refreshToken = await TokenStorage.getRefreshToken();
        if (refreshToken == null) {
          handler.next(error);
          return;
        }

        try {
          // Dio "nu" (sans intercepteur) pour éviter une boucle de retry infinie.
          final plain = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
          final response = await plain.post('/auth/refresh', data: {'refreshToken': refreshToken});
          await TokenStorage.save(
            accessToken: response.data['accessToken'],
            refreshToken: response.data['refreshToken'],
          );

          final retryOptions = error.requestOptions;
          retryOptions.headers['Authorization'] = 'Bearer ${response.data['accessToken']}';
          final retryResponse = await plain.fetch(retryOptions);
          handler.resolve(retryResponse);
        } catch (_) {
          await TokenStorage.clear();
          handler.next(error);
        }
      },
    ),
  );

  return dio;
});

/// Vérifie la connectivité réelle au backend déployé (GET /health).
final apiHealthProvider = FutureProvider<bool>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final response = await dio.get('/health');
    return response.statusCode == 200 && response.data['status'] == 'ok';
  } on DioException {
    return false;
  }
});
