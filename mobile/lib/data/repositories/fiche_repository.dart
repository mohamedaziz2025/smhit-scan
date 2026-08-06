import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../models/fiche.dart';

class FicheRepository {
  final Dio _dio;
  FicheRepository(this._dio);

  Future<FicheModel> scan({
    required String clientId,
    required String siteId,
    required String ficheType,
    List<File> images = const [],
  }) async {
    final formData = FormData.fromMap({
      'clientId': clientId,
      'siteId': siteId,
      'ficheType': ficheType,
      for (final img in images) 'images': await MultipartFile.fromFile(img.path, filename: img.uri.pathSegments.last),
    });

    final response = await _dio.post('/fiches/scan', data: formData);
    return FicheModel.fromJson(response.data);
  }

  Future<FicheModel> get(String id) async {
    final response = await _dio.get('/fiches/$id');
    return FicheModel.fromJson(response.data);
  }

  Future<List<FicheSummary>> myFiches({String? status}) async {
    final response = await _dio.get('/fiches', queryParameters: {if (status != null) 'status': status});
    return (response.data['items'] as List).map((e) => FicheSummary.fromJson(e)).toList();
  }

  Future<FicheModel> patch(String id, Map<String, dynamic> body) async {
    final response = await _dio.patch('/fiches/$id', data: body);
    return FicheModel.fromJson(response.data);
  }

  Future<FicheModel> validate(String id) async {
    final response = await _dio.post('/fiches/$id/validate');
    return FicheModel.fromJson(response.data);
  }
}

final ficheRepositoryProvider = Provider<FicheRepository>((ref) => FicheRepository(ref.watch(dioProvider)));
