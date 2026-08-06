import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';

class ProductRepository {
  final Dio _dio;
  ProductRepository(this._dio);

  /// GET /products/resolve?ref=... (§9) — renvoie null si la référence est inconnue.
  Future<Map<String, dynamic>?> resolve(String ref) async {
    try {
      final response = await _dio.get('/products/resolve', queryParameters: {'ref': ref});
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }
}

final productRepositoryProvider = Provider<ProductRepository>((ref) => ProductRepository(ref.watch(dioProvider)));
