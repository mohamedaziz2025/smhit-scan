import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_config.dart';

final dioProvider = Provider<Dio>((ref) {
  return Dio(
    BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 8),
    ),
  );
});

/// Vérifie la connectivité réelle au backend déployé (GET /health).
/// Utilisé pour valider les tests agent ↔ serveur sans attendre le Module 6.
final apiHealthProvider = FutureProvider<bool>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final response = await dio.get('/health');
    return response.statusCode == 200 && response.data['status'] == 'ok';
  } on DioException {
    return false;
  }
});
