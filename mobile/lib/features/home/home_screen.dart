import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme.dart';
import '../../core/auth/auth_state.dart';

/// Accueil avec tuiles selon rôle (§11).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final role = auth?.role ?? UserRole.agent;

    final tiles = <_Tile>[
      if (role == UserRole.agent) ...[
        _Tile('Scanner une fiche', Icons.document_scanner_outlined, '/scan'),
        _Tile('Mes fiches', Icons.assignment_outlined, '/my-fiches'),
      ],
      if (role == UserRole.admin || role == UserRole.superAdmin) ...[
        _Tile('Clients', Icons.apartment_outlined, '/clients'),
        _Tile('Rapports à valider', Icons.fact_check_outlined, '/reports'),
        _Tile('Analytics', Icons.insights_outlined, '/analytics'),
      ],
      if (role == UserRole.superAdmin) ...[
        _Tile('Utilisateurs', Icons.group_outlined, '/admin/users'),
        _Tile('Catalogue produits', Icons.inventory_2_outlined, '/admin/products'),
        _Tile('Paramètres système', Icons.settings_outlined, '/admin/settings'),
      ],
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text('Bonjour, ${auth?.fullName ?? ''}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              ref.read(authControllerProvider.notifier).logout();
              context.go('/login');
            },
          ),
        ],
      ),
      body: GridView.count(
        padding: const EdgeInsets.all(16),
        crossAxisCount: 2,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        children: tiles.map((t) => _HomeTile(tile: t)).toList(),
      ),
    );
  }
}

class _Tile {
  final String label;
  final IconData icon;
  final String route;
  _Tile(this.label, this.icon, this.route);
}

class _HomeTile extends StatelessWidget {
  final _Tile tile;
  const _HomeTile({required this.tile});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(smhitRadius),
        onTap: () => context.go(tile.route),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(tile.icon, size: 32, color: SmhitColors.brand),
              const SizedBox(height: 12),
              Text(tile.label, textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}
