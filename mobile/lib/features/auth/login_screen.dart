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

/// Écran de connexion — Module 6 : vraie authentification (POST /auth/login).
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;

  @override
  void initState() {
    super.initState();
    // Restaure la session si un token valide est déjà persisté (Hive).
    Future.microtask(() => ref.read(authControllerProvider.notifier).restoreSession());
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final ok = await ref
        .read(authControllerProvider.notifier)
        .login(_emailCtrl.text.trim(), _passwordCtrl.text);
    if (ok && mounted) context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final health = ref.watch(apiHealthProvider);

    ref.listen(authControllerProvider, (previous, next) {
      if (next.isAuthenticated && mounted) context.go('/home');
    });

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
                    child: Form(
                      key: _formKey,
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
                          TextFormField(
                            controller: _emailCtrl,
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            decoration: const InputDecoration(
                              labelText: "Email",
                              prefixIcon: Icon(Icons.mail_outline_rounded),
                            ),
                            validator: (v) => (v == null || !v.contains('@')) ? "Email invalide" : null,
                          ),
                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _passwordCtrl,
                            obscureText: _obscure,
                            textInputAction: TextInputAction.done,
                            onFieldSubmitted: (_) => _submit(),
                            decoration: InputDecoration(
                              labelText: "Mot de passe",
                              prefixIcon: const Icon(Icons.lock_outline_rounded),
                              suffixIcon: IconButton(
                                icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                                onPressed: () => setState(() => _obscure = !_obscure),
                              ),
                            ),
                            validator: (v) => (v == null || v.isEmpty) ? "Mot de passe requis" : null,
                          ),
                          if (authState.error != null) ...[
                            const SizedBox(height: 12),
                            Text(authState.error!, style: const TextStyle(color: SmhitColors.danger, fontSize: 12.5)),
                          ],
                          const SizedBox(height: 24),
                          authState.isLoading
                              ? const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 14),
                                  child: CircularProgressIndicator(color: SmhitColors.brand),
                                )
                              : GradientButton(
                                  label: "Se connecter",
                                  icon: Icons.login_rounded,
                                  onPressed: _submit,
                                ),
                          const SizedBox(height: 24),
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
