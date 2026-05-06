from django.http import HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response


def api_test(request):
    return HttpResponse("working", content_type="text/plain")


@api_view(['GET'])
def hello_api(request):
    return Response({'message': 'Spaces service OK'})
