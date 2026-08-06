import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../models/client.dart';

class ClientRepository {
  final Dio _dio;
  ClientRepository(this._dio);

  Future<List<ClientModel>> list({String? search}) async {
    final response = await _dio.get('/clients', queryParameters: {if (search != null) 'search': search});
    return (response.data['items'] as List).map((e) => ClientModel.fromJson(e)).toList();
  }

  Future<List<SiteModel>> sitesOf(String clientId) async {
    final response = await _dio.get('/clients/$clientId/sites');
    return (response.data as List).map((e) => SiteModel.fromJson(e)).toList();
  }
}

final clientRepositoryProvider = Provider<ClientRepository>((ref) => ClientRepository(ref.watch(dioProvider)));
