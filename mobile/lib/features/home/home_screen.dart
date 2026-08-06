import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme.dart';
import '../../core/auth/auth_state.dart';
import '../../core/widgets/smhit_logo.dart';

/// Accueil avec tuiles selon rôle (§11) — design premium (§12).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider).user;
    final role = auth?.role ?? UserRole.agent;

    final tiles = <_Tile>[
      if (role == UserRole.agent) ...[
        _Tile('Scanner une fiche', 'Caméra ou upload', Icons.document_scanner_outlined, '/scan'),
        _Tile('Mes fiches', 'Historique & statuts', Icons.assignment_outlined, '/my-fiches'),
      ],
      if (role == UserRole.admin || role == UserRole.superAdmin) ...[
        _Tile('Clients', 'Sites & interventions', Icons.apartment_outlined, '/clients'),
        _Tile('Rapports', 'File de validation', Icons.fact_check_outlined, '/reports'),
        _Tile('Analytics', 'Tendances & consommation', Icons.insights_outlined, '/analytics'),
      ],
      if (role == UserRole.superAdmin) ...[
        _Tile('Utilisateurs', 'Rôles & accès', Icons.group_outlined, '/admin/users'),
        _Tile('Catalogue produits', 'Réfs & imports', Icons.inventory_2_outlined, '/admin/products'),
        _Tile('Paramètres', 'Seuils IA, risques', Icons.settings_outlined, '/admin/settings'),
      ],
    ];

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: SmhitColors.bgGradient),
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: Row(
                    children: [
                      const SmhitLogo(size: 44),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Bonjour', style: Theme.of(context).textTheme.bodyMedium),
                            Text(auth?.fullName ?? '', style: Theme.of(context).textTheme.headlineSmall),
                          ],
                        ),
                      ),
                      _LogoutButton(
                        onTap: () {
                          ref.read(authControllerProvider.notifier).logout();
                          context.go('/login');
                        },
                      ),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.all(20),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 14,
                    mainAxisSpacing: 14,
                    childAspectRatio: 0.98,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, i) => _HomeTile(tile: tiles[i], delay: i * 60),
                    childCount: tiles.length,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tile {
  final String label;
  final String subtitle;
  final IconData icon;
  final String route;
  _Tile(this.label, this.subtitle, this.icon, this.route);
}

class _HomeTile extends StatefulWidget {
  final _Tile tile;
  final int delay;
  const _HomeTile({required this.tile, required this.delay});

  @override
  State<_HomeTile> createState() => _HomeTileState();
}

class _HomeTileState extends State<_HomeTile> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 350 + widget.delay),
      curve: Curves.easeOutCubic,
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(offset: Offset(0, (1 - t) * 12), child: child),
      ),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _pressed = true),
        onTapCancel: () => setState(() => _pressed = false),
        onTapUp: (_) => setState(() => _pressed = false),
        onTap: () => context.go(widget.tile.route),
        child: AnimatedScale(
          scale: _pressed ? 0.96 : 1,
          duration: const Duration(milliseconds: 120),
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: SmhitColors.surface,
              borderRadius: BorderRadius.circular(smhitRadius),
              border: Border.all(color: SmhitColors.border),
              boxShadow: smhitShadow(opacity: 0.6),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: SmhitColors.brandGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(widget.tile.icon, color: Colors.white, size: 22),
                ),
                const Spacer(),
                Text(widget.tile.label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14.5)),
                const SizedBox(height: 2),
                Text(
                  widget.tile.subtitle,
                  style: const TextStyle(color: SmhitColors.muted, fontSize: 11.5),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LogoutButton extends StatelessWidget {
  final VoidCallback onTap;
  const _LogoutButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: SmhitColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: SmhitColors.border),
        ),
        child: const Icon(Icons.logout_rounded, size: 18, color: SmhitColors.muted),
      ),
    );
  }
}
