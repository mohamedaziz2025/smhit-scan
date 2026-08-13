import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme.dart';
import '../../core/auth/auth_state.dart';
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

    ref.listen(authControllerProvider, (previous, next) {
      if (next.isAuthenticated && mounted) context.go('/home');
    });

    return Scaffold(
      body: Stack(
        children: [
          // Fond dégradé + orbes décoratifs flous — signature "SaaS premium"
          // plutôt qu'un simple aplat de couleur.
          const DecoratedBox(decoration: BoxDecoration(gradient: SmhitColors.bgGradient)),
          Positioned(top: -90, right: -70, child: _GradientOrb(size: 260, opacity: 0.16)),
          Positioned(bottom: -110, left: -90, child: _GradientOrb(size: 300, opacity: 0.12)),

          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: 1),
                    duration: const Duration(milliseconds: 500),
                    curve: Curves.easeOutCubic,
                    builder: (context, t, child) => Opacity(
                      opacity: t,
                      child: Transform.translate(offset: Offset(0, (1 - t) * 20), child: child),
                    ),
                    child: GlassCard(
                      padding: const EdgeInsets.fromLTRB(28, 40, 28, 32),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const SmhitLogo(size: 64),
                            const SizedBox(height: 22),
                            Text("SMHIT", style: Theme.of(context).textTheme.displayMedium),
                            const SizedBox(height: 6),
                            Text(
                              "Lutte antiparasitaire — fiches numériques",
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            const SizedBox(height: 36),
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
                            const SizedBox(height: 28),
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
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Orbe dégradé flou en arrière-plan — signature visuelle "premium" discrète,
/// cohérente avec l'orange SMHIT sans surcharger l'écran de connexion.
class _GradientOrb extends StatelessWidget {
  final double size;
  final double opacity;
  const _GradientOrb({required this.size, required this.opacity});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Transform.rotate(
        angle: math.pi / 6,
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: [SmhitColors.brand.withValues(alpha: opacity), SmhitColors.brand.withValues(alpha: 0)],
            ),
          ),
        ),
      ),
    );
  }
}
