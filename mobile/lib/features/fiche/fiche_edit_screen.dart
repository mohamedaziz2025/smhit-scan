import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../data/models/fiche.dart';
import '../../data/repositories/fiche_repository.dart';
import '../../data/repositories/product_repository.dart';

const _externeFields = [
  ('intact', 'Intact'),
  ('appatAltere', 'Appât altéré'),
  ('presenceCadavres', 'Présence cadavres'),
  ('consomme', 'Consommé'),
  ('disparu', 'Disparu'),
];

const _interneFields = [
  ('intact', 'Intact'),
  ('plaqueAlteree', 'Plaque altérée'),
  ('presenceCadavres', 'Présence cadavres'),
  ('disparu', 'Disparu'),
];

const _porteAppatFields = [
  ('inaccessible', 'Inaccessible'),
  ('disparu', 'Disparu'),
  ('malFixe', 'Mal fixé'),
  ('casse', 'Cassé'),
];

/// Tableau postes/cases + résolution produit (réf -> nom) — §11.
/// Édite deratExterne / deratInterne en cases à cocher ; désinsectisation en
/// lignes simples. Une fiche peut porter les 3 sections (§6 intro).
class FicheEditScreen extends ConsumerStatefulWidget {
  final String ficheId;
  const FicheEditScreen({super.key, required this.ficheId});

  @override
  ConsumerState<FicheEditScreen> createState() => _FicheEditScreenState();
}

class _FicheEditScreenState extends ConsumerState<FicheEditScreen> with SingleTickerProviderStateMixin {
  FicheModel? _fiche;
  late List<Map<String, dynamic>> _zonesExterne;
  late List<Map<String, dynamic>> _zonesInterne;
  late List<Map<String, dynamic>> _lignesDesinsect;
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final fiche = await ref.read(ficheRepositoryProvider).get(widget.ficheId);
    setState(() {
      _fiche = fiche;
      _zonesExterne = _deepListCopy(fiche.deratExterne?['zones']);
      _zonesInterne = _deepListCopy(fiche.deratInterne?['zones']);
      _lignesDesinsect = _deepListCopy(fiche.desinsectisation?['lignes']);
      _loading = false;
    });
  }

  List<Map<String, dynamic>> _deepListCopy(dynamic raw) {
    if (raw is! List) return [];
    return raw.map((e) => Map<String, dynamic>.from(_deepMapCopy(e))).toList();
  }

  Map<String, dynamic> _deepMapCopy(dynamic raw) {
    if (raw is! Map) return {};
    return raw.map((k, v) {
      if (v is Map) return MapEntry(k as String, _deepMapCopy(v));
      if (v is List) return MapEntry(k as String, v.map((e) => e is Map ? _deepMapCopy(e) : e).toList());
      return MapEntry(k as String, v);
    });
  }

  Future<void> _save({bool showFlash = true}) async {
    setState(() => _saving = true);
    try {
      final updated = await ref.read(ficheRepositoryProvider).patch(widget.ficheId, {
        'deratExterne': {'zones': _zonesExterne},
        'deratInterne': {'zones': _zonesInterne},
        'desinsectisation': {'lignes': _lignesDesinsect},
      });
      if (mounted) setState(() => _fiche = updated);
      if (showFlash) _showFlash('Fiche enregistrée.');
    } catch (_) {
      _showFlash("Échec de l'enregistrement.", isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _validate() async {
    await _save(showFlash: false);
    try {
      final validated = await ref.read(ficheRepositoryProvider).validate(widget.ficheId);
      if (mounted) {
        setState(() => _fiche = validated);
        _showFlash('Fiche validée — rapport généré automatiquement.');
      }
    } catch (_) {
      _showFlash('Échec de la validation.', isError: true);
    }
  }

  void _showFlash(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? SmhitColors.danger : SmhitColors.success,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _fiche == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: SmhitColors.brand)));
    }

    final fiche = _fiche!;
    final editable = fiche.isEditable;
    final lowConfidence = (fiche.ocrConfidence ?? 0) < 0.75;

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Text('Fiche · ${fiche.status}'),
          bottom: const TabBar(
            labelColor: SmhitColors.brand600,
            indicatorColor: SmhitColors.brand,
            tabs: [Tab(text: 'Externe'), Tab(text: 'Interne'), Tab(text: 'Désinsect.')],
          ),
        ),
        body: DecoratedBox(
          decoration: const BoxDecoration(gradient: SmhitColors.bgGradient),
          child: Column(
            children: [
              if (lowConfidence)
                Container(
                  width: double.infinity,
                  color: const Color(0xFFFFF7ED),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: const Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, size: 16, color: SmhitColors.warning),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          "Extraction IA à faible confiance — vérifiez chaque case avant de valider.",
                          style: TextStyle(fontSize: 12, color: SmhitColors.warning),
                        ),
                      ),
                    ],
                  ),
                ),
              Expanded(
                child: TabBarView(
                  children: [
                    _ZonesEditor(
                      zones: _zonesExterne,
                      fields: _externeFields,
                      etatKey: 'etatAppat',
                      editable: editable,
                      onChanged: () => setState(() {}),
                    ),
                    _ZonesEditor(
                      zones: _zonesInterne,
                      fields: _interneFields,
                      etatKey: 'etatPlaque',
                      editable: editable,
                      onChanged: () => setState(() {}),
                    ),
                    _DesinsectEditor(
                      lignes: _lignesDesinsect,
                      editable: editable,
                      onChanged: () => setState(() {}),
                    ),
                  ],
                ),
              ),
              if (editable)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _saving ? null : _save,
                          child: _saving ? const CircularProgressIndicator() : const Text('Enregistrer'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GradientButton(label: 'Valider la fiche', icon: Icons.check_rounded, onPressed: _validate),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Éditeur de zones dératisation (externe/interne, partagent la forme) */
/* ------------------------------------------------------------------ */

class _ZonesEditor extends StatefulWidget {
  final List<Map<String, dynamic>> zones;
  final List<(String, String)> fields;
  final String etatKey;
  final bool editable;
  final VoidCallback onChanged;

  const _ZonesEditor({
    required this.zones,
    required this.fields,
    required this.etatKey,
    required this.editable,
    required this.onChanged,
  });

  @override
  State<_ZonesEditor> createState() => _ZonesEditorState();
}

class _ZonesEditorState extends State<_ZonesEditor> {
  void _addZone() {
    setState(() => widget.zones.add({'zoneLabel': 'Zone N°${widget.zones.length + 1}', 'postes': []}));
    widget.onChanged();
  }

  void _addPoste(Map<String, dynamic> zone) {
    final postes = zone['postes'] as List;
    setState(() {
      postes.add({
        'posteNo': postes.length + 1,
        widget.etatKey: {for (final f in widget.fields) f.$1: false},
        'action': {'remplace': false},
        'produit': <String, dynamic>{},
        'etatPorteAppat': {for (final f in _porteAppatFields) f.$1: false},
      });
    });
    widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        for (final zone in widget.zones) _ZoneCard(zone: zone, fields: widget.fields, etatKey: widget.etatKey, editable: widget.editable, onAddPoste: () => _addPoste(zone), onChanged: widget.onChanged),
        if (widget.editable)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: OutlinedButton.icon(
              onPressed: _addZone,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Ajouter une zone'),
            ),
          ),
        if (widget.zones.isEmpty && !widget.editable)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(child: Text('Aucune zone.', style: TextStyle(color: SmhitColors.muted))),
          ),
      ],
    );
  }
}

class _ZoneCard extends StatelessWidget {
  final Map<String, dynamic> zone;
  final List<(String, String)> fields;
  final String etatKey;
  final bool editable;
  final VoidCallback onAddPoste;
  final VoidCallback onChanged;

  const _ZoneCard({
    required this.zone,
    required this.fields,
    required this.etatKey,
    required this.editable,
    required this.onAddPoste,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final postes = (zone['postes'] as List).cast<Map<String, dynamic>>();
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GlassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: editable
                      ? TextFormField(
                          initialValue: zone['zoneLabel'] as String?,
                          decoration: const InputDecoration(labelText: 'Zone', isDense: true),
                          onChanged: (v) => zone['zoneLabel'] = v,
                        )
                      : Text(zone['zoneLabel'] as String? ?? '', style: Theme.of(context).textTheme.titleMedium),
                ),
              ],
            ),
            const SizedBox(height: 12),
            for (final poste in postes) _PosteRow(poste: poste, fields: fields, etatKey: etatKey, editable: editable, onChanged: onChanged),
            if (editable)
              TextButton.icon(
                onPressed: onAddPoste,
                icon: const Icon(Icons.add_rounded, size: 16),
                label: const Text('Poste'),
              ),
          ],
        ),
      ),
    );
  }
}

class _PosteRow extends StatefulWidget {
  final Map<String, dynamic> poste;
  final List<(String, String)> fields;
  final String etatKey;
  final bool editable;
  final VoidCallback onChanged;

  const _PosteRow({required this.poste, required this.fields, required this.etatKey, required this.editable, required this.onChanged});

  @override
  State<_PosteRow> createState() => _PosteRowState();
}

class _PosteRowState extends State<_PosteRow> {
  String? _resolvedName;
  bool _resolving = false;

  Future<void> _resolve(WidgetRef ref, String refCode) async {
    if (refCode.isEmpty) return;
    setState(() => _resolving = true);
    final result = await ref.read(productRepositoryProvider).resolve(refCode);
    setState(() {
      _resolving = false;
      _resolvedName = result?['name'] as String?;
    });
    (widget.poste['produit'] as Map)['name'] = _resolvedName;
    (widget.poste['produit'] as Map)['refCode'] = refCode;
    widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final etat = widget.poste[widget.etatKey] as Map<String, dynamic>;
    final porteAppat = widget.poste['etatPorteAppat'] as Map<String, dynamic>;
    final produit = widget.poste['produit'] as Map<String, dynamic>;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: SmhitColors.bg, borderRadius: BorderRadius.circular(smhitRadiusSm)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Poste n°${widget.poste['posteNo']}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 4,
            children: widget.fields
                .map((f) => _MiniCheck(
                      label: f.$2,
                      value: etat[f.$1] == true,
                      editable: widget.editable,
                      onChanged: (v) {
                        setState(() => etat[f.$1] = v);
                        widget.onChanged();
                      },
                    ))
                .toList(),
          ),
          _MiniCheck(
            label: 'Remplacé',
            value: (widget.poste['action'] as Map)['remplace'] == true,
            editable: widget.editable,
            onChanged: (v) {
              setState(() => (widget.poste['action'] as Map)['remplace'] = v);
              widget.onChanged();
            },
          ),
          const SizedBox(height: 6),
          Consumer(
            builder: (context, ref, _) => Row(
              children: [
                Expanded(
                  child: TextFormField(
                    initialValue: produit['refCode'] as String?,
                    enabled: widget.editable,
                    decoration: InputDecoration(
                      labelText: 'Réf. produit',
                      isDense: true,
                      suffixText: _resolving ? '…' : _resolvedName ?? (produit['name'] as String?),
                      suffixStyle: const TextStyle(color: SmhitColors.success, fontSize: 11.5),
                    ),
                    onFieldSubmitted: (v) => _resolve(ref, v.trim().toUpperCase()),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Text('Porte-appât', style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 11)),
          Wrap(
            spacing: 4,
            children: _porteAppatFields
                .map((f) => _MiniCheck(
                      label: f.$2,
                      value: porteAppat[f.$1] == true,
                      editable: widget.editable,
                      onChanged: (v) {
                        setState(() => porteAppat[f.$1] = v);
                        widget.onChanged();
                      },
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _MiniCheck extends StatelessWidget {
  final String label;
  final bool value;
  final bool editable;
  final ValueChanged<bool> onChanged;

  const _MiniCheck({required this.label, required this.value, required this.editable, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label, style: const TextStyle(fontSize: 11)),
      selected: value,
      onSelected: editable ? (v) => onChanged(v) : null,
      selectedColor: SmhitColors.brandLight,
      checkmarkColor: SmhitColors.brand600,
      visualDensity: VisualDensity.compact,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Éditeur désinsectisation (lignes simples)                           */
/* ------------------------------------------------------------------ */

class _DesinsectEditor extends StatefulWidget {
  final List<Map<String, dynamic>> lignes;
  final bool editable;
  final VoidCallback onChanged;

  const _DesinsectEditor({required this.lignes, required this.editable, required this.onChanged});

  @override
  State<_DesinsectEditor> createState() => _DesinsectEditorState();
}

class _DesinsectEditorState extends State<_DesinsectEditor> {
  void _addLigne() {
    setState(() => widget.lignes.add({'zoneTraitee': '', 'produit': <String, dynamic>{}, 'observations': ''}));
    widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        for (final ligne in widget.lignes)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    initialValue: ligne['zoneTraitee'] as String?,
                    enabled: widget.editable,
                    decoration: const InputDecoration(labelText: 'Zone traitée', isDense: true),
                    onChanged: (v) => ligne['zoneTraitee'] = v,
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    initialValue: (ligne['produit'] as Map)['refCode'] as String?,
                    enabled: widget.editable,
                    decoration: const InputDecoration(labelText: 'Réf. produit', isDense: true),
                    onChanged: (v) => (ligne['produit'] as Map)['refCode'] = v.trim().toUpperCase(),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    initialValue: ligne['observations'] as String?,
                    enabled: widget.editable,
                    decoration: const InputDecoration(labelText: 'Observations', isDense: true),
                    onChanged: (v) => ligne['observations'] = v,
                  ),
                ],
              ),
            ),
          ),
        if (widget.editable)
          OutlinedButton.icon(onPressed: _addLigne, icon: const Icon(Icons.add_rounded, size: 18), label: const Text('Ajouter une ligne')),
      ],
    );
  }
}
