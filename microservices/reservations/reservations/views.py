from django.http import HttpResponse


def api_test(request):
    return HttpResponse("working", content_type="text/plain")
