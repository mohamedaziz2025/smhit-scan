import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/theme.dart';
import '../../data/models/fiche.dart';
import '../../data/repositories/fiche_repository.dart';

/// Historique des fiches de l'agent connecté — §11.
/// Le filtre par agent est appliqué côté API (l'agent ne voit que les siennes, §2).
class MyFichesScreen extends ConsumerStatefulWidget {
  const MyFichesScreen({super.key});

  @override
  ConsumerState<MyFichesScreen> createState() => _MyFichesScreenState();
}

class _MyFichesScreenState extends ConsumerState<MyFichesScreen> {
  late Future<List<FicheSummary>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(ficheRepositoryProvider).myFiches();
  }

  Future<void> _refresh() async {
    setState(() => _future = ref.read(ficheRepositoryProvider).myFiches());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes fiches')),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: SmhitColors.bgGradient),
        child: RefreshIndicator(
          onRefresh: _refresh,
          color: SmhitColors.brand,
          child: FutureBuilder<List<FicheSummary>>(
            future: _future,
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator(color: SmhitColors.brand));
              }
              final fiches = snapshot.data!;
              if (fiches.isEmpty) {
                return ListView(
                  children: const [
                    SizedBox(height: 120),
                    Center(child: Text('Aucune fiche pour le moment.', style: TextStyle(color: SmhitColors.muted))),
                  ],
                );
              }
              return ListView.separated(
                padding: const EdgeInsets.all(20),
                itemCount: fiches.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, i) => _FicheTile(fiche: fiches[i]),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _FicheTile extends StatelessWidget {
  final FicheSummary fiche;
  const _FicheTile({required this.fiche});

  @override
  Widget build(BuildContext context) {
    final (color, bg) = _statusColors(fiche.status);
    return InkWell(
      onTap: () => context.go('/fiche/${fiche.id}/edit'),
      borderRadius: BorderRadius.circular(smhitRadiusSm),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: SmhitColors.surface,
          borderRadius: BorderRadius.circular(smhitRadiusSm),
          border: Border.all(color: SmhitColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
              child: Icon(Icons.description_outlined, color: color, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(DateFormat('dd/MM/yyyy').format(fiche.interventionDate), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                  Text(fiche.status, style: TextStyle(color: color, fontSize: 11.5, fontWeight: FontWeight.w500)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: SmhitColors.muted),
          ],
        ),
      ),
    );
  }

  (Color, Color) _statusColors(String status) {
    switch (status) {
      case 'DRAFT':
        return (SmhitColors.warning, const Color(0xFFFFF7ED));
      case 'AGENT_VALIDATED':
        return (SmhitColors.success, const Color(0xFFEFFDF3));
      case 'LOCKED':
        return (SmhitColors.muted, SmhitColors.bg);
      default:
        return (SmhitColors.brand600, SmhitColors.brandLight);
    }
  }
}
