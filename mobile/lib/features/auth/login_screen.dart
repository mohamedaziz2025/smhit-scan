import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme.dart';
import '../../core/auth/auth_state.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_config.dart';

/// Écran de connexion — squelette Module 1.
/// L'appel réel POST /auth/login (JWT access/refresh) arrive au Module 6 ;
/// en attendant, 3 boutons "démo" permettent de tester le routage par rôle.
class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final health = ref.watch(apiHealthProvider);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: SmhitColors.brand.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    'SMHIT',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: SmhitColors.brand600, fontWeight: FontWeight.w600),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Fiches de lutte antiparasitaire',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Squelette Module 1 — connexion réelle au Module 6',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: SmhitColors.muted),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () => _loginAs(ref, context, UserRole.agent, 'Agent Démo'),
                  child: const Text('Se connecter — Agent'),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () => _loginAs(ref, context, UserRole.admin, 'Admin Démo'),
                  child: const Text('Se connecter — Admin'),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () => _loginAs(ref, context, UserRole.superAdmin, 'Super Admin Démo'),
                  child: const Text('Se connecter — Super Admin'),
                ),
                const SizedBox(height: 24),
                _ApiHealthBadge(health: health, onRetry: () => ref.invalidate(apiHealthProvider)),
                Text(
                  ApiConfig.baseUrl,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: SmhitColors.muted, fontSize: 11),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _loginAs(WidgetRef ref, BuildContext context, UserRole role, String name) {
    ref.read(authControllerProvider.notifier).login(AuthUser(fullName: name, role: role));
    context.go('/home');
  }
}

/// Badge de connectivité réelle au backend déployé — utile pour les tests
/// terrain (§ déploiement) tant que le vrai flux d'auth (Module 6) n'existe pas.
class _ApiHealthBadge extends StatelessWidget {
  final AsyncValue<bool> health;
  final VoidCallback onRetry;

  const _ApiHealthBadge({required this.health, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final (color, icon, label) = switch (health) {
      AsyncData(value: true) => (SmhitColors.success, Icons.check_circle_outline, 'API distante connectée'),
      AsyncData(value: false) => (SmhitColors.danger, Icons.error_outline, 'API distante inaccessible'),
      AsyncError() => (SmhitColors.danger, Icons.error_outline, 'API distante inaccessible'),
      _ => (SmhitColors.muted, Icons.sync, 'Vérification de la connexion…'),
    };

    return InkWell(
      onTap: onRetry,
      borderRadius: BorderRadius.circular(999),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(color: color, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
