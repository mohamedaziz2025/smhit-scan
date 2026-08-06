import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Rôles RBAC — voir §2 du cahier des charges.
enum UserRole { agent, admin, superAdmin }

class AuthUser {
  final String fullName;
  final UserRole role;

  const AuthUser({required this.fullName, required this.role});
}

/// État d'auth minimal pour le squelette (Module 1). L'intégration réelle
/// (login API, JWT access/refresh, cache sécurisé) arrive au Module 6.
class AuthController extends Notifier<AuthUser?> {
  @override
  AuthUser? build() => null;

  void login(AuthUser user) => state = user;

  void logout() => state = null;
}

final authControllerProvider = NotifierProvider<AuthController, AuthUser?>(
  AuthController.new,
);
