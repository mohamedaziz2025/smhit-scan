import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../app/theme.dart';
import '../../core/widgets/glass_card.dart';
import '../../core/widgets/gradient_button.dart';
import '../../data/models/client.dart';
import '../../data/repositories/client_repository.dart';
import '../../data/repositories/fiche_repository.dart';

const _ficheTypes = [
  ('DERATISATION_EXTERNE', 'Dératisation — zones externes'),
  ('DERATISATION_INTERNE', 'Dératisation — zones internes'),
  ('DESINSECTISATION', 'Désinsectisation'),
];

/// Écran de scan (§11) : choix client/site, capture image (caméra OS ou
/// galerie — la caméra "temps réel" avec cadre-guide en overlay est une
/// amélioration Module 6+ ; l'app photo native couvre déjà le besoin réel).
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  ClientModel? _client;
  SiteModel? _site;
  String _ficheType = _ficheTypes.first.$1;
  final List<File> _images = [];
  bool _submitting = false;
  String? _error;

  Future<void> _pickImage(ImageSource source) async {
    final picked = await ImagePicker().pickImage(source: source, imageQuality: 85);
    if (picked != null) setState(() => _images.add(File(picked.path)));
  }

  Future<void> _submit() async {
    if (_client == null || _site == null) {
      setState(() => _error = "Choisissez un client et un site.");
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final fiche = await ref.read(ficheRepositoryProvider).scan(
            clientId: _client!.id,
            siteId: _site!.id,
            ficheType: _ficheType,
            images: _images,
          );
      if (mounted) context.go('/fiche/${fiche.id}/edit');
    } on Object catch (e) {
      setState(() => _error = _friendlyError(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scanner une fiche')),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: SmhitColors.bgGradient),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Type de fiche', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 10),
                  ..._ficheTypes.map((t) {
                    final selected = t.$1 == _ficheType;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: InkWell(
                        onTap: () => setState(() => _ficheType = t.$1),
                        borderRadius: BorderRadius.circular(smhitRadiusSm),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 120),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: selected ? SmhitColors.brandLight : SmhitColors.bg,
                            borderRadius: BorderRadius.circular(smhitRadiusSm),
                            border: Border.all(color: selected ? SmhitColors.brand : SmhitColors.border),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                selected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                                size: 18,
                                color: selected ? SmhitColors.brand : SmhitColors.muted,
                              ),
                              const SizedBox(width: 10),
                              Text(t.$2, style: const TextStyle(fontSize: 13.5)),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 16),
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Client & site', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 12),
                  _ClientPicker(
                    selected: _client,
                    onSelected: (c) => setState(() {
                      _client = c;
                      _site = null;
                    }),
                  ),
                  if (_client != null) ...[
                    const SizedBox(height: 10),
                    _SitePicker(
                      clientId: _client!.id,
                      selected: _site,
                      onSelected: (s) => setState(() => _site = s),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Photos de la fiche papier', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      ..._images.map(
                        (f) => ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Stack(
                            children: [
                              Image.file(f, width: 84, height: 84, fit: BoxFit.cover),
                              Positioned(
                                top: 2,
                                right: 2,
                                child: GestureDetector(
                                  onTap: () => setState(() => _images.remove(f)),
                                  child: const CircleAvatar(
                                    radius: 11,
                                    backgroundColor: Colors.black54,
                                    child: Icon(Icons.close, size: 14, color: Colors.white),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      _AddImageButton(icon: Icons.photo_camera_outlined, label: 'Photo', onTap: () => _pickImage(ImageSource.camera)),
                      _AddImageButton(icon: Icons.photo_library_outlined, label: 'Galerie', onTap: () => _pickImage(ImageSource.gallery)),
                    ],
                  ),
                ],
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: const TextStyle(color: SmhitColors.danger, fontSize: 13)),
            ],
            const SizedBox(height: 24),
            _submitting
                ? const Center(child: CircularProgressIndicator(color: SmhitColors.brand))
                : GradientButton(label: 'Créer la fiche', icon: Icons.arrow_forward_rounded, onPressed: _submit),
          ],
        ),
      ),
    );
  }

  String _friendlyError(Object e) {
    final message = e.toString();
    if (message.contains('409')) return "Une fiche existe déjà pour ce client/site aujourd'hui.";
    return "Échec de l'envoi — vérifiez votre connexion et réessayez.";
  }
}

class _AddImageButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _AddImageButton({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 84,
        height: 84,
        decoration: BoxDecoration(
          color: SmhitColors.brandLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: SmhitColors.border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: SmhitColors.brand600, size: 22),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 10.5, color: SmhitColors.brand600)),
          ],
        ),
      ),
    );
  }
}

class _ClientPicker extends ConsumerWidget {
  final ClientModel? selected;
  final ValueChanged<ClientModel> onSelected;
  const _ClientPicker({required this.selected, required this.onSelected});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder<List<ClientModel>>(
      future: ref.read(clientRepositoryProvider).list(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const LinearProgressIndicator(color: SmhitColors.brand);
        return DropdownButtonFormField<ClientModel>(
          initialValue: selected,
          decoration: const InputDecoration(labelText: 'Client', prefixIcon: Icon(Icons.apartment_outlined)),
          items: snapshot.data!
              .map((c) => DropdownMenuItem(value: c, child: Text(c.name, overflow: TextOverflow.ellipsis)))
              .toList(),
          onChanged: (c) => c != null ? onSelected(c) : null,
        );
      },
    );
  }
}

class _SitePicker extends ConsumerWidget {
  final String clientId;
  final SiteModel? selected;
  final ValueChanged<SiteModel> onSelected;
  const _SitePicker({required this.clientId, required this.selected, required this.onSelected});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder<List<SiteModel>>(
      future: ref.read(clientRepositoryProvider).sitesOf(clientId),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const LinearProgressIndicator(color: SmhitColors.brand);
        if (snapshot.data!.isEmpty) {
          return const Text('Aucun site pour ce client.', style: TextStyle(color: SmhitColors.muted, fontSize: 12.5));
        }
        return DropdownButtonFormField<SiteModel>(
          initialValue: selected,
          decoration: const InputDecoration(labelText: 'Site', prefixIcon: Icon(Icons.location_on_outlined)),
          items: snapshot.data!
              .map((s) => DropdownMenuItem(value: s, child: Text(s.name, overflow: TextOverflow.ellipsis)))
              .toList(),
          onChanged: (s) => s != null ? onSelected(s) : null,
        );
      },
    );
  }
}
