import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'ootd_upload_provider.dart';

class OotdUploadScreen extends ConsumerWidget {
  const OotdUploadScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(uploadProvider);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text(
          'OOTD',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            letterSpacing: 4,
          ),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            ref.read(uploadProvider.notifier).reset();
            context.pop();
          },
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: _ImageArea(state: state)),
              const SizedBox(height: 20),
              _ActionArea(state: state),
            ],
          ),
        ),
      ),
    );
  }
}

class _ImageArea extends StatelessWidget {
  final UploadState state;
  const _ImageArea({required this.state});

  @override
  Widget build(BuildContext context) {
    if (state.imagePath != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.file(
          File(state.imagePath!),
          fit: BoxFit.cover,
        ),
      );
    }
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A1A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF333333)),
      ),
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.add_photo_alternate_outlined,
                size: 48, color: Colors.white38),
            SizedBox(height: 12),
            Text(
              '오늘의 코디를 올려보세요',
              style: TextStyle(color: Colors.white38, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionArea extends ConsumerWidget {
  final UploadState state;
  const _ActionArea({required this.state});

  Future<void> _pickImage(
      BuildContext context, WidgetRef ref, ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 85);
    if (picked == null) return;
    await ref.read(uploadProvider.notifier).analyzeImage(picked.path);
  }

  void _showSourceSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_outlined),
              title: const Text('갤러리'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(context, ref, ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('카메라'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(context, ref, ImageSource.camera);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    switch (state.status) {
      case UploadStatus.idle:
        return _PrimaryButton(
          label: '사진 선택',
          onPressed: () => _showSourceSheet(context, ref),
        );

      case UploadStatus.analyzing:
        return const Column(
          children: [
            CircularProgressIndicator(color: Colors.white),
            SizedBox(height: 12),
            Text(
              'AI가 코디를 분석하는 중...',
              style: TextStyle(color: Colors.white60, fontSize: 13),
            ),
          ],
        );

      case UploadStatus.done:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '${state.items.length}개 아이템 감지됨',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white60, fontSize: 13),
            ),
            const SizedBox(height: 12),
            _PrimaryButton(
              label: '아이템 편집 →',
              onPressed: () => context.push('/ootd/edit',
                  extra: {'imagePath': state.imagePath, 'items': state.items}),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => _showSourceSheet(context, ref),
              child: const Text('다시 선택',
                  style: TextStyle(color: Colors.white38)),
            ),
          ],
        );

      case UploadStatus.error:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              state.errorMessage ?? '분석 실패',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.redAccent, fontSize: 13),
            ),
            const SizedBox(height: 12),
            _PrimaryButton(
              label: '다시 시도',
              onPressed: () => _showSourceSheet(context, ref),
            ),
          ],
        );
    }
  }
}

class _PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  const _PrimaryButton({required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(26),
        ),
        child: Center(
          child: Text(
            label,
            style: const TextStyle(
              color: Colors.black,
              fontWeight: FontWeight.w600,
              fontSize: 15,
            ),
          ),
        ),
      ),
    );
  }
}
