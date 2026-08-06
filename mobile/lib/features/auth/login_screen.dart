import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme.dart';
import '../../core/auth/auth_state.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_config.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../core/widgets/smhit_logo.dart';

/// Écran de connexion — design premium (§12).
/// L'appel réel POST /auth/login (JWT access/refresh) arrive au Module 6 ;
/// en attendant, 3 rôles "démo" permettent de tester le routage RBAC.
class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final health = ref.watch(apiHealthProvider);

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: SmhitColors.bgGradient),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: 1),
                  duration: const Duration(milliseconds: 450),
                  curve: Curves.easeOutCubic,
                  builder: (context, t, child) => Opacity(
                    opacity: t,
                    child: Transform.translate(offset: Offset(0, (1 - t) * 16), child: child),
                  ),
                  child: GlassCard(
                    padding: const EdgeInsets.fromLTRB(28, 36, 28, 28),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SmhitLogo(),
                        const SizedBox(height: 20),
                        Text("SMHIT", style: Theme.of(context).textTheme.displayMedium),
                        const SizedBox(height: 6),
                        Text(
                          "Lutte antiparasitaire — fiches numériques",
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 32),
                        _RoleTile(
                          icon: Icons.qr_code_scanner_rounded,
                          title: "Agent",
                          subtitle: "Scanner et valider des fiches",
                          isPrimary: true,
                          onTap: () => _loginAs(ref, context, UserRole.agent, "Agent Démo"),
                        ),
                        const SizedBox(height: 12),
                        _RoleTile(
                          icon: Icons.fact_check_outlined,
                          title: "Admin",
                          subtitle: "Valider rapports, analyser",
                          onTap: () => _loginAs(ref, context, UserRole.admin, "Admin Démo"),
                        ),
                        const SizedBox(height: 12),
                        _RoleTile(
                          icon: Icons.admin_panel_settings_outlined,
                          title: "Super Admin",
                          subtitle: "Accès total, paramètres système",
                          onTap: () => _loginAs(ref, context, UserRole.superAdmin, "Super Admin Démo"),
                        ),
                        const SizedBox(height: 28),
                        _ApiHealthBadge(health: health, onRetry: () => ref.invalidate(apiHealthProvider)),
                        const SizedBox(height: 6),
                        Text(
                          ApiConfig.baseUrl,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: SmhitColors.muted, fontSize: 10.5),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
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

class _RoleTile extends StatefulWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isPrimary;
  final VoidCallback onTap;

  const _RoleTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.isPrimary = false,
  });

  @override
  State<_RoleTile> createState() => _RoleTileState();
}

class _RoleTileState extends State<_RoleTile> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    if (widget.isPrimary) {
      return GradientButton(label: widget.title, icon: widget.icon, onPressed: widget.onTap);
    }

    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: (_) => setState(() => _pressed = false),
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: _pressed ? SmhitColors.brandLight : SmhitColors.bg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: SmhitColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: SmhitColors.brandLight, borderRadius: BorderRadius.circular(10)),
              child: Icon(widget.icon, color: SmhitColors.brand600, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14.5)),
                  Text(widget.subtitle, style: const TextStyle(color: SmhitColors.muted, fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: SmhitColors.muted),
          ],
        ),
      ),
    );
  }
}

class _ApiHealthBadge extends StatelessWidget {
  final AsyncValue<bool> health;
  final VoidCallback onRetry;

  const _ApiHealthBadge({required this.health, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final (color, bg, icon, label) = switch (health) {
      AsyncData(value: true) => (SmhitColors.success, const Color(0xFFEFFDF3), Icons.check_circle_rounded, 'API connectée'),
      AsyncData(value: false) => (SmhitColors.danger, const Color(0xFFFEF2F2), Icons.error_rounded, 'API inaccessible'),
      AsyncError() => (SmhitColors.danger, const Color(0xFFFEF2F2), Icons.error_rounded, 'API inaccessible'),
      _ => (SmhitColors.muted, SmhitColors.bg, Icons.sync_rounded, 'Vérification…'),
    };

    return InkWell(
      onTap: onRetry,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}
