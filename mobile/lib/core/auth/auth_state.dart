import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';
import '../storage/token_storage.dart';

/// Rôles RBAC — voir §2 du cahier des charges (miroir de UserRole côté API).
enum UserRole { agent, admin, superAdmin }

UserRole roleFromBackend(String value) {
  switch (value) {
    case 'ADMIN':
      return UserRole.admin;
    case 'SUPER_ADMIN':
      return UserRole.superAdmin;
    default:
      return UserRole.agent;
  }
}

class AuthUser {
  final String id;
  final String fullName;
  final String email;
  final UserRole role;

  const AuthUser({required this.id, required this.fullName, required this.email, required this.role});

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        fullName: json['fullName'] as String,
        email: json['email'] as String,
        role: roleFromBackend(json['role'] as String),
      );
}

class AuthState {
  final AuthUser? user;
  final bool isLoading;
  final String? error;

  const AuthState({this.user, this.isLoading = false, this.error});

  AuthState copyWith({AuthUser? user, bool? isLoading, String? error}) =>
      AuthState(user: user ?? this.user, isLoading: isLoading ?? this.isLoading, error: error);

  bool get isAuthenticated => user != null;
}

/// Auth réelle (Module 6) : POST /auth/login, restauration de session via
/// les tokens persistés (Hive), déconnexion avec révocation serveur.
class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  Future<void> restoreSession() async {
    final access = await TokenStorage.getAccessToken();
    if (access == null) return;

    state = state.copyWith(isLoading: true);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.get('/auth/me');
      state = AuthState(user: AuthUser.fromJson(response.data));
    } catch (_) {
      await TokenStorage.clear();
      state = const AuthState();
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.post('/auth/login', data: {'email': email, 'password': password});

      await TokenStorage.save(
        accessToken: response.data['accessToken'],
        refreshToken: response.data['refreshToken'],
      );

      state = AuthState(user: AuthUser.fromJson(response.data['user']));
      return true;
    } on DioException catch (e) {
      final message = e.response?.data is Map ? e.response?.data['error'] as String? : null;
      state = AuthState(error: message ?? 'Connexion impossible — vérifiez le réseau.');
      return false;
    }
  }

  Future<void> logout() async {
    final refreshToken = await TokenStorage.getRefreshToken();
    if (refreshToken != null) {
      try {
        await ref.read(dioProvider).post('/auth/logout', data: {'refreshToken': refreshToken});
      } catch (_) {
        // best-effort — on nettoie localement même si l'appel réseau échoue.
      }
    }
    await TokenStorage.clear();
    state = const AuthState();
  }
}

final authControllerProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);
